'use server';

/**
 * @fileOverview Predicts operational expenses for an upcoming truck trip using historical data and current conditions.
 *
 * - predictExpenses - A function that handles the expense prediction process.
 * - PredictExpensesInput - The input type for the predictExpenses function.
 * - PredictExpensesOutput - The return type for the predictExpenses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictExpensesInputSchema = z.object({
  tripDistanceMiles: z
    .number()
    .describe('The distance of the upcoming trip in miles.'),
  historicalFuelEfficiencyMpg: z
    .number()
    .describe('The historical average fuel efficiency of the truck in miles per gallon.'),
  currentFuelPricePerGallon: z
    .number()
    .describe('The current price of fuel per gallon.'),
  expectedMaintenanceHours: z
    .number()
    .describe('The expected number of maintenance hours required for the trip.'),
  hourlyMaintenanceCost: z
    .number()
    .describe('The cost per hour for maintenance.'),
  otherExpenses: z
    .number()
    .optional()
    .describe('Any other expected expenses for the trip.'),
});
export type PredictExpensesInput = z.infer<typeof PredictExpensesInputSchema>;

const PredictExpensesOutputSchema = z.object({
  predictedFuelCost: z
    .number()
    .describe('The predicted cost of fuel for the trip.'),
  predictedMaintenanceCost: z
    .number()
    .describe('The predicted cost of maintenance for the trip.'),
  predictedTotalCost: z
    .number()
    .describe('The predicted total operational expenses for the trip.'),
  additionalNotes: z.string().optional().describe('Additional notes or considerations for the expense prediction.'),
});

export type PredictExpensesOutput = z.infer<typeof PredictExpensesOutputSchema>;

export async function predictExpenses(input: PredictExpensesInput): Promise<PredictExpensesOutput> {
  return predictExpensesFlow(input);
}

const predictExpensesPrompt = ai.definePrompt({
  name: 'predictExpensesPrompt',
  input: {schema: PredictExpensesInputSchema},
  output: {schema: PredictExpensesOutputSchema},
  prompt: (input) => [
    {
      text: `You are an AI assistant specializing in predicting operational expenses for truck trips.

  Based on the provided information, calculate the predicted fuel cost, maintenance cost, and total operational expenses for the upcoming trip.

  Trip Distance: ${input.tripDistanceMiles} miles
  Historical Fuel Efficiency: ${input.historicalFuelEfficiencyMpg} mpg
  Current Fuel Price: $${input.currentFuelPricePerGallon}/gallon
  Expected Maintenance Hours: ${input.expectedMaintenanceHours} hours
  Hourly Maintenance Cost: $${input.hourlyMaintenanceCost}/hour
  Other Expenses: $${input.otherExpenses || 0}

  Consider all the input data to generate the predicted expenses in the specified output format. Ensure accuracy and provide a detailed breakdown.
  Include a brief note about any assumptions or uncertainties in the prediction.
  `,
    },
  ],
});

const predictExpensesFlow = ai.defineFlow(
  {
    name: 'predictExpensesFlow',
    inputSchema: PredictExpensesInputSchema,
    outputSchema: PredictExpensesOutputSchema,
  },
  async input => {
    const {output} = await predictExpensesPrompt(input);
    return output!;
  }
);
