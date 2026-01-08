#!/usr/bin/env python3
"""
Simple script to create CSV file with all test cases
"""

import csv

# Test cases data - extracted from TEST_CASES.md
test_cases = []

# Authentication & Login (WA001-WA015)
auth_cases = [
    ["WA001", "Authentication", "Login Page", "Valid user login with correct credentials", "1. Navigate to login page\n2. Enter valid email address\n3. Enter valid password\n4. Click \"Sign In\" button", "Email: admin@example.com\nPassword: Admin@123", "User should be successfully logged in and redirected to dashboard. Success toast message should appear.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA002", "Authentication", "Login Page", "Login with invalid email format", "1. Navigate to login page\n2. Enter invalid email (e.g., \"invalidemail\")\n3. Enter any password\n4. Click \"Sign In\" button", "Email: invalidemail\nPassword: Test@123", "Email validation should prevent submission or show error message. User should not be logged in.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA003", "Authentication", "Login Page", "Login with empty email field", "1. Navigate to login page\n2. Leave email field empty\n3. Enter password\n4. Click \"Sign In\" button", "Email: (empty)\nPassword: Test@123", "Error message \"Please fill in all fields\" should be displayed. User should not be logged in.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA004", "Authentication", "Login Page", "Login with empty password field", "1. Navigate to login page\n2. Enter valid email\n3. Leave password field empty\n4. Click \"Sign In\" button", "Email: admin@example.com\nPassword: (empty)", "Error message \"Please fill in all fields\" should be displayed. User should not be logged in.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA005", "Authentication", "Login Page", "Login with incorrect password", "1. Navigate to login page\n2. Enter valid email\n3. Enter incorrect password\n4. Click \"Sign In\" button", "Email: admin@example.com\nPassword: WrongPass@123", "Error message \"Invalid email or password\" should be displayed. User should not be logged in.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA006", "Authentication", "Login Page", "Login with non-existent email", "1. Navigate to login page\n2. Enter email that doesn't exist in database\n3. Enter any password\n4. Click \"Sign In\" button", "Email: nonexistent@example.com\nPassword: Test@123", "Error message \"Invalid email or password\" should be displayed. User should not be logged in.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA007", "Authentication", "Login Page", "Login with inactive user account", "1. Navigate to login page\n2. Enter email of inactive user\n3. Enter correct password\n4. Click \"Sign In\" button", "Email: inactive@example.com\nPassword: (correct password)", "Error message \"Your account is not active. Please contact administrator.\" should be displayed. User should not be logged in.", "", "Pass/Fail/Blocked", "Critical", "", ""],
    ["WA008", "Authentication", "Login Page", "Password visibility toggle", "1. Navigate to login page\n2. Enter password\n3. Click eye icon to toggle visibility", "Password: Test@123", "Password should toggle between visible and hidden states when clicking the eye icon.", "", "Pass/Fail/Blocked", "Low", "", ""],
    ["WA009", "Authentication", "Login Page", "Theme toggle functionality", "1. Navigate to login page\n2. Click theme toggle button (sun/moon icon)", "N/A", "Theme should toggle between light and dark mode. UI should update accordingly.", "", "Pass/Fail/Blocked", "Low", "", ""],
    ["WA010", "Authentication", "Login Page", "Auto-redirect if already authenticated", "1. User is already logged in\n2. Navigate to /login page", "N/A", "User should be automatically redirected to /dashboard page without showing login form.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA011", "Authentication", "Login Page", "Network error handling", "1. Disconnect network\n2. Navigate to login page\n3. Enter credentials\n4. Click \"Sign In\" button", "Email: admin@example.com\nPassword: Admin@123", "Error message \"Network error. Please try again.\" should be displayed. User should not be logged in.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA012", "Authentication", "Login Page", "Loading state during login", "1. Navigate to login page\n2. Enter valid credentials\n3. Click \"Sign In\" button", "Email: admin@example.com\nPassword: Admin@123", "Button should show loading state (disabled/spinner). User should not be able to submit multiple times.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA013", "Authentication", "Login Page", "JWT token storage", "1. Navigate to login page\n2. Login with valid credentials\n3. Check browser localStorage", "Email: admin@example.com\nPassword: Admin@123", "JWT token should be stored in localStorage with key \"auth-token\". Token should be valid.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA014", "Authentication", "Login Page", "HTTP-only cookie set", "1. Navigate to login page\n2. Login with valid credentials\n3. Check browser cookies", "Email: admin@example.com\nPassword: Admin@123", "HTTP-only cookie \"auth-token\" should be set with 7 days expiry. Cookie should be httpOnly and secure in production.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA015", "Authentication", "Login Page", "Case-insensitive email login", "1. Navigate to login page\n2. Enter email with different case\n3. Enter correct password\n4. Click \"Sign In\"", "Email: ADMIN@EXAMPLE.COM\nPassword: Admin@123", "User should be successfully logged in regardless of email case.", "", "Pass/Fail/Blocked", "Low", "", ""],
]

# User Management test cases (WA201-WA260) - Key ones
user_mgmt_cases = [
    ["WA201", "User Management", "User List", "View all users from external API", "1. Login as admin/super_admin\n2. Navigate to User Management page from sidebar\n3. Wait for data to load", "API: https://dms-rust-omega.vercel.app/api/admin/users", "All users should be displayed in a table format with columns: User Info, Contact Details, Location, Role & Status, Account Details, Groups, Actions. Data should be fetched from external API.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA202", "User Management", "Statistics Cards", "View total users count", "1. Navigate to User Management page\n2. View statistics cards at the top", "N/A", "Total Users card should display accurate count of all users fetched from API.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA203", "User Management", "Statistics Cards", "View active users count", "1. Navigate to User Management page\n2. View statistics cards", "N/A", "Active card should display count of users with isActive=true. Count should match filtered data.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA204", "User Management", "Statistics Cards", "View verified users count", "1. Navigate to User Management page\n2. View statistics cards", "N/A", "Verified card should display count of users with isVerified=true. Count should be accurate.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA205", "User Management", "Statistics Cards", "View subscribers count", "1. Navigate to User Management page\n2. View statistics cards", "N/A", "Subscribers card should display count of users with isSubscriber=true. Count should be accurate.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA206", "User Management", "Statistics Cards", "View inactive users count", "1. Navigate to User Management page\n2. View statistics cards", "N/A", "Inactive card should display count of users with isActive=false. Count should be accurate.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA207", "User Management", "Search Functionality", "Search users by name", "1. Navigate to User Management page\n2. Enter name in search box", "Search: \"John\"", "Only users with \"John\" in their fullName should be displayed. Search should be case-insensitive.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA208", "User Management", "Search Functionality", "Search users by email", "1. Navigate to User Management page\n2. Enter email in search box", "Search: \"admin@dms.com\"", "Only users with matching email should be displayed. Search should work with partial matches.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA209", "User Management", "Search Functionality", "Search users by username", "1. Navigate to User Management page\n2. Enter username in search box", "Search: \"admin1\"", "Only users with matching username should be displayed. Search should work with partial matches.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA210", "User Management", "Search Functionality", "Search users by phone number", "1. Navigate to User Management page\n2. Enter phone number in search box", "Search: \"+919876543210\"", "Only users with matching phone number should be displayed. Search should work with partial matches.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA211", "User Management", "Search Functionality", "Search with no results", "1. Navigate to User Management page\n2. Enter search term that doesn't match any user", "Search: \"NonExistentUser123\"", "\"No Users Found\" message should be displayed with appropriate icon. Table should show empty state.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA212", "User Management", "Filter Functionality", "Filter by role - SUPER_ADMIN", "1. Navigate to User Management page\n2. Select \"SUPER_ADMIN\" from role filter dropdown", "Role: SUPER_ADMIN", "Only users with role \"SUPER_ADMIN\" should be displayed. Filter count should update.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA213", "User Management", "Filter Functionality", "Filter by role - ADMIN", "1. Navigate to User Management page\n2. Select \"ADMIN\" from role filter dropdown", "Role: ADMIN", "Only users with role \"ADMIN\" should be displayed. Filter count should update.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA214", "User Management", "Filter Functionality", "Filter by role - MEMBER", "1. Navigate to User Management page\n2. Select \"MEMBER\" from role filter dropdown", "Role: MEMBER", "Only users with role \"MEMBER\" should be displayed. Filter count should update.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA215", "User Management", "Filter Functionality", "Filter by role - GUEST", "1. Navigate to User Management page\n2. Select \"GUEST\" from role filter dropdown", "Role: GUEST", "Only users with role \"GUEST\" should be displayed. Filter count should update.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA216", "User Management", "Filter Functionality", "Filter by status - Active", "1. Navigate to User Management page\n2. Select \"Active\" from status filter dropdown", "Status: Active", "Only users with isActive=true should be displayed. Filter count should update.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA217", "User Management", "Filter Functionality", "Filter by status - Inactive", "1. Navigate to User Management page\n2. Select \"Inactive\" from status filter dropdown", "Status: Inactive", "Only users with isActive=false should be displayed. Filter count should update.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA218", "User Management", "Filter Functionality", "Filter by status - Deleted", "1. Navigate to User Management page\n2. Select \"Deleted\" from status filter dropdown", "Status: Deleted", "Only users with deletedAt not null should be displayed. Filter count should update.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA219", "User Management", "Filter Functionality", "Combine search and role filter", "1. Navigate to User Management page\n2. Enter search term\n3. Select role filter", "Search: \"admin\"\nRole: ADMIN", "Only users matching both search term and role filter should be displayed. Filters should work together.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA220", "User Management", "Filter Functionality", "Combine search and status filter", "1. Navigate to User Management page\n2. Enter search term\n3. Select status filter", "Search: \"test\"\nStatus: Active", "Only users matching both search term and status filter should be displayed. Filters should work together.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA221", "User Management", "View Mode Toggle", "Switch to table view", "1. Navigate to User Management page\n2. Click table view icon button", "N/A", "Users should be displayed in table format with proper spacing (px-6 py-4). All columns should be visible.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA222", "User Management", "View Mode Toggle", "Switch to grid view", "1. Navigate to User Management page\n2. Click grid view icon button", "N/A", "Users should be displayed in card grid format. Cards should show user info, contact, and action button.", "", "Pass/Fail/Blocked", "Medium", "", ""],
    ["WA230", "User Management", "Table View", "Proper spacing in table cells", "1. Navigate to User Management page\n2. View table layout", "N/A", "Table cells should have proper spacing (px-6 py-4). No clustering or cramped appearance. Text should be readable with appropriate font sizes.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA233", "User Management", "View User Details", "Open user details modal", "1. Navigate to User Management page\n2. Click \"View\" button on any user", "User ID: (any valid user)", "Modal should open displaying complete user information including profile, contact, location, personal info, account details, and groups.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA242", "User Management", "Refresh Functionality", "Refresh user data", "1. Navigate to User Management page\n2. Click \"Refresh\" button", "N/A", "Data should be refetched from API. Loading state should be shown. Updated data should be displayed. Refresh button should show spinning icon during load.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA243", "User Management", "API Integration", "Fetch users from external API", "1. Navigate to User Management page\n2. Check network tab", "API: https://dms-rust-omega.vercel.app/api/admin/users", "API should be called successfully. Response should contain users array and pagination object. Data should be displayed correctly.", "", "Pass/Fail/Blocked", "Critical", "", ""],
    ["WA244", "User Management", "API Integration", "Handle API error", "1. Simulate API failure\n2. Navigate to User Management page", "API Error: 500 or network error", "Error toast should be displayed. Appropriate error message should be shown. Page should not crash.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA248", "User Management", "Responsive Design", "View on mobile device", "1. Open User Management page on mobile\n2. Check table layout", "Screen Size: < 640px", "Table should be horizontally scrollable. Columns should maintain proper spacing. Text should be readable.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA251", "User Management", "Authorization", "Access with super_admin role", "1. Login as super_admin\n2. Navigate to User Management page", "User Role: super_admin", "User should be able to access User Management page. Sidebar should show \"User Management\" menu item.", "", "Pass/Fail/Blocked", "High", "", ""],
    ["WA254", "User Management", "Data Mapping", "Verify all user fields displayed", "1. Navigate to User Management page\n2. Open user details modal\n3. Verify all fields", "User with complete data", "All 34+ fields from API should be properly mapped and displayed: id, phoneNumber, email, username, fullName, dateOfBirth, gender, profilePictureUrl, address, city, state, country, pincode, emergencyContactName, emergencyContactPhone, bloodGroup, medicalConditions, authProvider, providerId, isVerified, isActive, emailVerified, phoneVerified, planLimit, isSubscriber, role, roleAssignedBy, roleAssignedAt, lastLoginAt, deletedAt, createdAt, updatedAt, adminGroups, memberGroups.", "", "Pass/Fail/Blocked", "Critical", "", ""],
]

# Combine all test cases
all_test_cases = auth_cases + user_mgmt_cases

# Write to CSV
headers = [
    "Test Case ID",
    "Module",
    "Feature / Screen",
    "Test Scenario",
    "Test Steps",
    "Test Data",
    "Expected Result",
    "Actual Result",
    "Status (Pass/Fail/Blocked)",
    "Severity (Low/Medium/High/Critical)",
    "Defect ID",
    "Remarks"
]

with open("Test_Cases.csv", "w", newline="", encoding="utf-8-sig") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)
    writer.writerows(all_test_cases)

print(f"Successfully created Test_Cases.csv with {len(all_test_cases)} test cases")
print(f"  - Authentication & Login: {len(auth_cases)} test cases")
print(f"  - User Management: {len(user_mgmt_cases)} test cases")

