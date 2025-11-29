import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createWhatsAppMessage, processWhatsAppMessage, updateWhatsAppMessage } from '@/lib/data';
import { processReceiptImage } from '@/lib/services/ocr';
import type { ExtractedReceiptData } from '@/lib/types';
import { getTripById, getWhatsAppMessageById } from '@/lib/supabase/database';
import crypto from 'crypto';

// Webhook payload types
interface TwilioWebhookPayload {
  MessageSid?: string;
  From?: string; // WhatsApp: whatsapp:+1234567890
  To?: string;
  Body?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: 'text' | 'image';
          text?: { body?: string };
          image?: {
            id?: string;
            mime_type?: string;
            caption?: string;
            sha256?: string;
          };
        };
        contacts?: Array<{
          wa_id?: string;
          profile?: { name?: string };
        }>;
      };
    }>;
  }>;
}

// Helper to verify webhook signature (for Twilio)
function verifyTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn('TWILIO_AUTH_TOKEN not configured - skipping signature verification (enable in production)');
    return true; // Allow if not configured (for development)
  }
  
  if (!signature) {
    console.warn('Twilio signature missing - rejecting webhook');
    return false; // Reject if signature is expected but missing
  }

  // Create the signature string
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc += key + params[key];
      return acc;
    }, url);

  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(data, 'utf-8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Helper to verify Meta webhook signature
function verifyMetaSignature(
  signature: string | null,
  payload: string
): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.warn('META_APP_SECRET not configured - skipping signature verification (enable in production)');
    return true; // Allow if not configured (for development)
  }
  
  if (!signature) {
    console.warn('Meta signature missing - rejecting webhook');
    return false; // Reject if signature is expected but missing
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload, 'utf-8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}

// Helper to normalize phone number (remove whatsapp: prefix, etc.)
function normalizePhoneNumber(phone: string): string {
  return phone
    .replace(/^whatsapp:/i, '')
    .replace(/^\+/, '')
    .trim();
}

// Helper to fetch Meta image URL from image ID
async function fetchMetaImageUrl(imageId: string): Promise<string> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN not configured');
  }

  const url = `https://graph.facebook.com/v18.0/${imageId}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Meta image fetch error:', response.status, errorText);
    throw new Error(`Failed to fetch Meta image URL: ${response.status}`);
  }

  const data = await response.json();
  return data.url; // Meta returns the image URL
}

// Helper to download image from URL
async function downloadImage(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  return await response.blob();
}

// Helper to upload image to Supabase Storage
async function uploadToSupabaseStorage(
  blob: Blob,
  fileName: string,
  supabase: ReturnType<typeof createServerClient>
): Promise<string> {
  const filePath = `receipts/${fileName}`;
  const file = new File([blob], fileName, { type: blob.type });

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading to Supabase Storage:', uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
  return urlData.publicUrl;
}

// Helper to send WhatsApp reply message
async function sendWhatsAppReply(
  toPhone: string,
  message: string
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Your Twilio WhatsApp number

  const metaPhoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const metaAccessToken = process.env.META_ACCESS_TOKEN;

  // Try Twilio first
  if (accountSid && authToken && whatsappNumber) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${whatsappNumber}`);
      formData.append('To', `whatsapp:${toPhone}`);
      formData.append('Body', message);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Twilio API error:', response.status, errorText);
        throw new Error(`Twilio API error: ${response.status}`);
      }

      return;
    } catch (error) {
      console.error('Error sending via Twilio:', error);
      // Fall through to Meta
    }
  }

  // Try Meta WhatsApp Business API
  if (metaPhoneNumberId && metaAccessToken) {
    try {
      const metaUrl = `https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`;
      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toPhone,
          type: 'text',
          text: { body: message },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Meta API error:', response.status, errorText);
        throw new Error(`Meta API error: ${response.status}`);
      }

      return;
    } catch (error) {
      console.error('Error sending via Meta:', error);
      throw new Error('Failed to send WhatsApp reply via both Twilio and Meta');
    }
  }

  // If neither is configured, log warning but don't fail
  console.warn('No WhatsApp provider configured (Twilio or Meta). Message not sent:', message);
}

// GET handler for webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Meta webhook verification
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('Meta webhook verified');
    return NextResponse.json(parseInt(challenge || '0'));
  }

  // Twilio webhook verification (usually not needed, but handle gracefully)
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

// POST handler for receiving webhooks
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let payload: TwilioWebhookPayload | MetaWebhookPayload;
    let isTwilio = false;
    let isMeta = false;

    // Parse payload based on content type
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Twilio sends form data
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries()) as TwilioWebhookPayload;
      isTwilio = true;

      // Verify Twilio signature
      const signature = request.headers.get('x-twilio-signature');
      const url = request.url.split('?')[0]; // Remove query params
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });

      if (!verifyTwilioSignature(signature, url, params)) {
        console.warn('Invalid Twilio webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else if (contentType.includes('application/json')) {
      // Meta sends JSON
      const rawBody = await request.text();
      payload = JSON.parse(rawBody) as MetaWebhookPayload;
      isMeta = true;

      // Verify Meta signature
      const signature = request.headers.get('x-hub-signature-256');
      if (!verifyMetaSignature(signature, rawBody)) {
        console.warn('Invalid Meta webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    // Extract message data based on provider
    let phoneNumber: string | null = null;
    let messageType: 'image' | 'text' = 'text';
    let imageUrl: string | null = null;
    let messageBody: string | null = null;

    if (isTwilio) {
      const twilioPayload = payload as TwilioWebhookPayload;
      phoneNumber = twilioPayload.From ? normalizePhoneNumber(twilioPayload.From) : null;
      messageBody = twilioPayload.Body || null;
      
      // Check if message has media
      const numMedia = parseInt(twilioPayload.NumMedia || '0');
      if (numMedia > 0 && twilioPayload.MediaUrl0) {
        messageType = 'image';
        imageUrl = twilioPayload.MediaUrl0;
      }
    } else if (isMeta) {
      const metaPayload = payload as MetaWebhookPayload;
      
      // Extract from Meta payload structure
      const entry = metaPayload.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];
      const contact = change?.value?.contacts?.[0];

      if (message && contact) {
        phoneNumber = contact.wa_id || message.from ? normalizePhoneNumber(message.from || '') : null;
        
        if (message.type === 'image' && message.image?.id) {
          messageType = 'image';
          // Meta requires fetching image URL via API
          // Store the image ID and fetch URL later during processing
          imageUrl = message.image.id; // Will be treated as Meta image ID
          messageBody = message.image.caption || null;
        } else if (message.type === 'text' && message.text) {
          messageBody = message.text.body || null;
        }
      }
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    console.log(`Received WhatsApp message from ${phoneNumber}, type: ${messageType}`);

    // Create Supabase client
    const supabase = createServerClient();

    // Create WhatsApp message record in database
    const whatsappMessage = await createWhatsAppMessage({
      phone_number: phoneNumber,
      message_type: messageType,
      image_url: imageUrl || undefined,
      raw_ocr_text: messageBody || undefined,
    });

    if (!whatsappMessage) {
      console.error('Failed to create WhatsApp message record');
      await sendWhatsAppReply(
        phoneNumber,
        '❌ Could not process receipt. Please try again or add manually.'
      );
      return NextResponse.json({ error: 'Failed to create message record' }, { status: 500 });
    }

    // Process image if present
    if (messageType === 'image' && imageUrl) {
      try {
        // Handle Meta image ID (need to fetch URL first)
        let actualImageUrl = imageUrl;
        if (isMeta && !imageUrl.startsWith('http')) {
          // Meta image ID - fetch the actual URL
          console.log(`Fetching Meta image URL for ID: ${imageUrl}`);
          actualImageUrl = await fetchMetaImageUrl(imageUrl);
        }

        // Download image from WhatsApp URL
        console.log(`Downloading image from: ${actualImageUrl}`);
        const imageBlob = await downloadImage(actualImageUrl);

        // Upload to Supabase Storage
        const timestamp = Date.now();
        // Get file extension from actual image URL or default to jpg
        const fileExt = actualImageUrl.split('.').pop()?.split('?')[0] || imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `whatsapp-${whatsappMessage.id}-${timestamp}.${fileExt}`;
        
        console.log(`Uploading image to Supabase Storage: ${fileName}`);
        const supabaseImageUrl = await uploadToSupabaseStorage(imageBlob, fileName, supabase);

        // Update message with Supabase image URL
        await updateWhatsAppMessage(whatsappMessage.id, {
          imageUrl: supabaseImageUrl,
        });

        // Call OCR service to process image
        console.log(`Processing image with OCR: ${supabaseImageUrl}`);
        const extractedData = await processReceiptImage(supabaseImageUrl);

        // Update message with extracted data
        await updateWhatsAppMessage(whatsappMessage.id, {
          extractedData: extractedData,
          rawOcrText: JSON.stringify(extractedData),
        });

        // Auto-create expense if OCR has required data (amount and category)
        if (extractedData.amount && extractedData.category) {
          try {
            // Process the message (creates expense and links it)
            await processWhatsAppMessage(whatsappMessage.id, extractedData);

            // Refetch message to get tripId after processing
            const processedMessage = await getWhatsAppMessageById(whatsappMessage.id);
            
            // Get trip name for reply message
            let tripName = '';
            if (processedMessage?.tripId) {
              const trip = await getTripById(processedMessage.tripId);
              tripName = trip?.name || '';
            }

            // Format amount with currency
            const currency = extractedData.currency || 'USD';
            const amountStr = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
              minimumFractionDigits: 2,
            }).format(extractedData.amount);

            // Send success reply
            const successMessage = `✅ ${amountStr} [${extractedData.category}] logged${tripName ? ` - Trip: ${tripName}` : ''}`;
            await sendWhatsAppReply(phoneNumber, successMessage);

            return NextResponse.json({ status: 'success', message: 'Receipt processed and expense created' }, { status: 200 });
          } catch (processError) {
            console.error('Error processing WhatsApp message:', processError);
            
            // Send error reply
            await sendWhatsAppReply(
              phoneNumber,
              '❌ Could not process receipt. Please try again or add manually.'
            );

            return NextResponse.json({ error: 'Failed to process receipt' }, { status: 500 });
          }
        } else {
          // OCR didn't extract enough data
          console.warn('OCR did not extract required data (amount and category)');
          await sendWhatsAppReply(
            phoneNumber,
            '⚠️ Receipt received but couldn\'t extract all details. Please add expense manually.'
          );

          return NextResponse.json({ status: 'partial', message: 'Image processed but insufficient data' }, { status: 200 });
        }
      } catch (imageError) {
        console.error('Error processing image:', imageError);
        
        // Update message with error
        await updateWhatsAppMessage(whatsappMessage.id, {
          errorMessage: imageError instanceof Error ? imageError.message : 'Unknown error processing image',
        });

        // Send error reply
        await sendWhatsAppReply(
          phoneNumber,
          '❌ Could not process receipt image. Please try again or add manually.'
        );

        return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
      }
    } else {
      // Text message (not an image)
      console.log(`Text message received: ${messageBody}`);
      await sendWhatsAppReply(
        phoneNumber,
        '📸 Please send a receipt image to log an expense.'
      );

      return NextResponse.json({ status: 'success', message: 'Text message received' }, { status: 200 });
    }
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

