# Database Seeding & Testing Guide

## 🌱 How to Seed the Database

### Step 1: Access the Seed Page

Navigate to: **`/admin/seed`** in your browser

Or go to: `http://localhost:9002/admin/seed`

### Step 2: Click "Start Seeding"

The seed process will:
1. ✅ Create 6 Truck Units
2. ✅ Create 7 Drivers (6 active, 1 inactive)
3. ✅ Create 14 Trips (upcoming, ongoing, completed)
4. ✅ Create 50+ Transactions (expenses in CAD & USD, income)

### Step 3: Wait for Completion

The page will show:
- Progress indicators
- Success/error messages
- Summary of created items

---

## 📊 What Gets Created

### Units (6 trucks)
- Freightliner Cascadia 125
- Kenworth T680
- Peterbilt 579
- Volvo VNL 860
- International LT Series
- Mack Anthem

### Drivers (7 drivers)
1. John Michael Smith - Active
2. Jane Elizabeth Doe - Active
3. Michael Robert Johnson - Active
4. Sarah Anne Williams - Active
5. David Christopher Brown - Active
6. Emily Grace Martinez - **Inactive** (for testing inactive driver features)
7. Robert James Taylor - Active

### Trips (14 trips)
- **Completed trips**: Various routes with full expense records
- **Ongoing trips**: Currently in progress with partial expenses
- **Upcoming trips**: Scheduled for future dates

### Transactions (50+ entries)
- **Expenses in CAD**: Canadian fuel, meals, lodging, tolls
- **Expenses in USD**: US fuel, meals, lodging, tolls
- **Income entries**: Payment records for completed trips
- **All categories**: Fuel, Food, Lodging, Tolls, Maintenance, Parking, Other

---

## 🧪 Comprehensive Testing Checklist

After seeding, test each functionality:

### 1. Dashboard (`/`)
- [ ] Total Expenses shows CAD and USD separately
- [ ] Grand Total calculated correctly
- [ ] Date range filter works for expenses
- [ ] Charts display correctly
- [ ] Active trips count is accurate
- [ ] Total trucks count is accurate

### 2. Trips Page (`/trips`)
- [ ] All trips display correctly
- [ ] Trip cards/table show all fields
- [ ] Filter by status (All, Upcoming, Ongoing, Completed)
- [ ] Filter by date range (start date, end date)
- [ ] Sort by Date, Name, Status, Distance
- [ ] Sort order (Ascending, Descending)
- [ ] Clear filters button works
- [ ] Add new trip functionality
- [ ] Edit trip functionality
- [ ] Delete trip functionality
- [ ] Expenses show CAD/USD separately
- [ ] Grand total displays correctly for each trip

### 3. Units Page (`/units`)
- [ ] All 6 units display
- [ ] Unit details show correctly
- [ ] Add new unit works
- [ ] Edit unit works
- [ ] Purchase date allows past dates
- [ ] All fields are functional

### 4. Drivers Page (`/drivers`)
- [ ] All 7 drivers display
- [ ] Active/inactive status shows correctly
- [ ] Add new driver works
- [ ] Edit driver works
- [ ] Delete driver works
- [ ] Inactive driver (Emily Martinez) doesn't appear in selection lists
- [ ] Password field works correctly

### 5. Admin Driver Profile (`/admin/drivers/[id]/dashboard`)
- [ ] All driver profiles accessible
- [ ] Header information displays correctly
- [ ] Summary cards show correct totals
- [ ] CAD and USD expenses shown separately
- [ ] Grand total displayed
- [ ] Ongoing trips section expands/collapses
- [ ] Completed trips section expands/collapses
- [ ] Expense tables show CAD expenses separately
- [ ] Expense tables show USD expenses separately
- [ ] Edit expense functionality works
- [ ] Add expense functionality works
- [ ] Date range filter works
- [ ] Status filter works
- [ ] Sort functionality works
- [ ] Receipt links work (if available)
- [ ] Trip details show correctly

### 6. Driver Login (`/driver/login`)
- [ ] Login with seeded driver credentials
- [ ] Active drivers can log in
- [ ] Inactive driver (Emily) cannot log in
- [ ] Shows "profile is inactive" message for inactive driver

### 7. Driver Dashboard (`/driver/dashboard`)
- [ ] Driver's trips display correctly
- [ ] Ongoing trips show correctly
- [ ] Completed trips show correctly
- [ ] Expenses show CAD/USD separately
- [ ] Grand total displays
- [ ] Add expense works
- [ ] Date range filter works
- [ ] Status filter works
- [ ] Sort functionality works

### 8. Reports Page (`/reports`)
- [ ] All trips display in reports
- [ ] Filter by date range works
- [ ] Filter by status works
- [ ] Filter by driver works
- [ ] CSV export works
- [ ] Export includes all relevant data
- [ ] Summary cards show correct totals

### 9. Settings Page (`/settings`)
- [ ] Page loads without errors
- [ ] All settings sections display

### 10. Currency Testing
- [ ] CAD expenses stored and displayed correctly
- [ ] USD expenses stored and displayed correctly
- [ ] Currency conversion works (Grand Total)
- [ ] Mixed currency expenses on same trip work
- [ ] Primary currency setting respected

### 11. Date & Time Testing
- [ ] Past dates selectable for purchase dates
- [ ] Past dates selectable for trip dates
- [ ] Future dates selectable for upcoming trips
- [ ] Date range filters work correctly
- [ ] Date formatting displays correctly

### 12. Filter & Sort Testing
- [ ] All filter combinations work
- [ ] Sort works with filters applied
- [ ] Clear filters resets everything
- [ ] Filters persist during navigation (if implemented)

### 13. Responsive Design
- [ ] All pages work on mobile
- [ ] All pages work on tablet
- [ ] All pages work on desktop
- [ ] Sidebar behaves correctly on all sizes
- [ ] Tables adapt to mobile (card view)

### 14. Error Handling
- [ ] Invalid data shows appropriate errors
- [ ] Missing fields show validation messages
- [ ] Network errors handled gracefully
- [ ] Empty states display correctly

---

## 🔧 Testing Credentials

### Driver Login Credentials (for testing)

1. **John Smith**
   - Email: `john.smith@truckops.com`
   - Password: `Driver@123`

2. **Jane Doe**
   - Email: `jane.doe@truckops.com`
   - Password: `Driver@456`

3. **Mike Johnson**
   - Email: `mike.johnson@truckops.com`
   - Password: `Driver@789`

4. **Sarah Williams**
   - Email: `sarah.williams@truckops.com`
   - Password: `Driver@321`

5. **David Brown**
   - Email: `david.brown@truckops.com`
   - Password: `Driver@654`

6. **Emily Martinez** (INACTIVE - should not be able to log in)
   - Email: `emily.martinez@truckops.com`
   - Password: `Driver@987`

7. **Robert Taylor**
   - Email: `robert.taylor@truckops.com`
   - Password: `Driver@147`

---

## 🐛 Common Issues & Fixes

### Issue: "Supabase not configured"
**Fix**: Check that `.env.local` has correct Supabase credentials

### Issue: "Driver with this email already exists"
**Fix**: Clear existing data or use different email addresses

### Issue: "Transaction creation failed"
**Fix**: Ensure trips exist before creating transactions (seed in order)

### Issue: "Date not selectable"
**Fix**: Check `minDate` prop in DatePicker components

### Issue: "Currency conversion incorrect"
**Fix**: Check conversion rates in currency utility functions

---

## ✅ Post-Seeding Verification

After seeding, verify:
1. All units appear in `/units`
2. All drivers appear in `/drivers`
3. All trips appear in `/trips`
4. Expenses appear on trip detail pages
5. Driver dashboards show correct data
6. Reports page has data to export

---

## 🔄 Re-seeding

To re-seed the database:
1. **Option 1**: Clear existing data manually via Supabase dashboard
2. **Option 2**: Modify seed script to handle duplicates (add checks)
3. **Option 3**: Delete all data via SQL in Supabase SQL Editor

**Warning**: Re-seeding without clearing will create duplicate entries!

---

## 📝 Notes

- Seed script creates realistic, varied data
- Includes edge cases (inactive driver, mixed currencies, various dates)
- All expense categories are covered
- Both CAD and USD expenses are included
- Income transactions are included for completed trips
- Various trip statuses are included

---

## 🚀 Next Steps After Seeding

1. Test all CRUD operations
2. Test all filters and sorting
3. Test currency conversions
4. Test date range selections
5. Test responsive design
6. Test error handling
7. Fix any issues found
8. Document any bugs or improvements needed







