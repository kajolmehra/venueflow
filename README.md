# VenueFlow

VenueFlow is a full-stack Event Posting and Ticket Booking System built for the Laravel + React technical assessment.

It includes the three required application areas:

- `CRM Application`: super admin panel for countries, stadiums, admin analytics, ticket data, and payment data
- `Admin Application`: organizer portal for creating and managing events
- `User Application`: booking portal for browsing events, filtering, cart management, and checkout

## Stack

- Backend: Laravel 12 API
- Frontend: React + Vite
- Auth: Laravel Sanctum
- State: Redux Toolkit for cart
- Payments: Stripe test mode support with local demo fallback
- Real-time: Laravel Reverb WebSockets
- Database: MySQL

## Features Implemented

### CRM Application

- Add countries
- Remove countries
- Only added countries are available for event posting
- Add stadiums
- Assign stadiums to countries
- Remove stadiums
- View total registered admins
- View number of events posted by each admin
- View event details including country, stadium, date, and time
- View tickets sold per event
- View purchaser details for issued tickets
- View payment details for purchases

### Admin Application

- Admin registration and login
- Create events using allowed country and stadium data
- Update events
- Set event date, start time, end time, price, and total tickets
- View total events posted
- View tickets sold per event
- View buyer details and payment information
- Stop an event
- Delete an event
- Real-time ticket count and revenue updates after purchase

### User Application

- User registration and login
- View event list
- Filter by stadium, date, and time
- Add tickets to cart
- Add tickets from multiple events to the same cart
- Purchase one or more tickets
- Checkout with Stripe test mode when keys are configured
- Local demo checkout when Stripe keys are not configured
- Real-time event create, update, stop, and delete changes from admin side

## Project Structure

```text
backend/   Laravel API and broadcasting
frontend/  React application for CRM, Admin, and User portals
screenshot/ optional project screenshots for review
```

The frontend is a single React app with separate route areas:

- `/crm`
- `/admin`
- `/events`

## Demo Accounts

- CRM: `crm@venueflow.test` / `Password123!`
- Organizer: `organizer@venueflow.test` / `Password123!`
- User: `booker@venueflow.test` / `Password123!`

## Quick Start

### 1. Clone and install

```powershell
git clone <your-repo-url>
cd interview
```

### 2. Backend setup

```powershell
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan config:clear
```

Update `backend/.env` if needed:

- MySQL database credentials
- `FRONTEND_URL=http://127.0.0.1:5173`
- `BROADCAST_CONNECTION=reverb`

Reverb variables are already supported in `.env.example`.

### 3. Frontend setup

```powershell
cd ..\frontend
npm install
```

## Running The Project

You need Laravel, Reverb, and Vite running together.

### Option A: Run services separately

Backend API:

```powershell
cd backend
php artisan serve
```

Reverb WebSocket server:

```powershell
cd backend
php artisan reverb:start --host=0.0.0.0 --port=8080
```

Frontend:

```powershell
cd frontend
npm run dev
```

### Option B: Use Composer helper

If you want to use the combined Laravel dev script:

```powershell
cd backend
composer dev
```

Then run the frontend if needed from another terminal:

```powershell
cd frontend
npm run dev
```

## URLs

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- Reverb WebSocket: `ws://127.0.0.1:8080`

## Stripe Notes

This project supports two checkout modes:

### Stripe test mode

If you want to test with Stripe, add these to `backend/.env`:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_CURRENCY=inr
```

Only Stripe `test` keys are accepted.

### Local demo checkout

If Stripe keys are not provided, the app falls back to a built-in demo checkout flow so the assignment can still be reviewed without external credentials.

## Real-Time Notes

Real-time updates use Laravel Reverb WebSockets.

To verify real-time behavior:

- Create, update, stop, or delete an event in the admin portal and observe the user portal update
- Purchase tickets in the user portal and observe the admin dashboard ticket count and revenue update
- View CRM analytics updating from newly created events and purchases

If real-time updates do not work:

1. Confirm `BROADCAST_CONNECTION=reverb` in `backend/.env`
2. Confirm Reverb is running on port `8080`
3. Restart Laravel after `.env` changes
4. Hard refresh the browser after restarting Vite

## Verification

Commands used during verification:

```powershell
cd backend
php artisan migrate:fresh --seed
php artisan test
php artisan route:list

cd ..\frontend
npm run build
```

## Screenshots

Project screenshots are available in the [`screenshot`](./screenshot) folder.

## Interview Notes

- The system uses role-based access with three application experiences on one shared domain model.
- Redux is used specifically for the cart, as required in the brief.
- Ticket issuance stores buyer and payment details per purchase.
- Stopped, deleted, and sold-out events are protected against invalid purchases at the backend level.
- Real-time updates are implemented with Laravel Reverb instead of polling.

"# venueflow" 
"# venueflow" 
