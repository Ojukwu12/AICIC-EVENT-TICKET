# Event Ticker

**core goal** A robust user friendly interface that enable seamless event booking and management with user data security and 24/7 access to all features.

- Project status: DEVELOPMENT

## Features

- Account creation available according to needs
- Real‑time event management
- Search, filter, and sort by title, description, price, location, date and time of choice
- Book any Event of your choice
- Make your payments using our paystack intgrated secure payment gateway

## Prerequisites

- ENGINE (Express V 5.1.0)
- packageManager (npm) installed

## Quick Start

```bash
# 1) Clone
git https://github.com/Ojukwu12/AICIC-EVENT-TICKET.git && cd Event Ticker

# 2) Configure
cp config.env


# 3) Install
npm install

# 4) start (prod)
  npm start
```

## Configuration

Common variables:

- PORT=7000
- NODE_ENV= development
- BASE_URL=https://aicic-event-ticket.onrender.com

## Scripts

- start- npm start

## Folder Structure

- /controllers (admin,auth,bookings,events,payment,error)
- /middlewares(onlyAdmin, protectRoute, eventAccess)
- /models (user,event,ticket)
- /routes (admin,auth,bookings,events,payment)
- /services (cronJobs)
- /Templates (attendee, organizer, everybody)
- /utils (appError, asyncHandler, mailer, sendMail)
- app
- config.env
- index.js

## Architecture

Event shape (example):

```json
{
  "success": true,
  "data": "data",
  "message": "Operation Succesful"
}
```

## API END POINTS

**NOTE** 
{}-----compulsory = End point will throw and error if not passed in
()-----not compulsory = End point will not throw an error but the option is available
auth:

- POST {BASE_URL}/api/v1/auth/signup
- POST {BASE_URL}/api/v1/auth/login
- POST {BASE_URL}/api/v1/auth/forgot-password
- PUT {BASE_URL}/auth/reset-password/{resetToken}
- POST {BASE_URL}/api/v1/auth/refresh-token
- GET {BASE_URL}/api/v1/auth/get-myProfile
- POST {BASE_URL}/api/v1/auth/logout
  event:
  POST {BASE_URL}/api/v1/events/
  GET {BASE_URL}/api/v1/events/(filter)
  GET {BASE_URL}/api/v1/events/{eventId}
  PUT {BASE_URL}/api/v1/events/{eventId}
  DELETE {BASE_URL}/api/v1/events/{eventId}
  PUT {BASE_URL}/api/v1/events/{eventId}/status
  GET {BASE_URL}/api/v1/events/search/{filter}
  GET {BASE_URL}/api/v1/events/category/{filter}
  GET {BASE_URL}/api/v1/events/organizer
  GET {BASE_URL}/api/v1/events/featured
  payment:
  POST {BASE_URL}/api/v1/payments/initialize
  GET {BASE_URL}/api/v1/payments/verify/{ref}
  POST {BASE_URL}/api/v1/payments/webhook?
  GET {BASE_URL}/api/v1/payments/{ticketsId}
  GET {BASE_URL}/api/v1/payments/tickets/{ticketId}/payments
  GET {BASE_URL}/api/v1/payments/user/payment
  POST {BASE_URL}/api/v1/payments/tickets/{ticketId}/complete-free
  GET {BASE_URL}/api/v1/payments/admin/payment
  ticket:
  POST {BASE_URL}/api/v1/tickets/reserve
  GET {BASE_URL}/api/v1/tickets/
  GET {BASE_URL}/api/v1/tickets/{eventId}
  PUT {BASE_URL}/api/v1/tickets/{eventId}/cancel
  GET {BASE_URL}/api/v1/tickets/{eventId}/availability
  GET {BASE_URL}/api/v1/tickets/organizer/events/{OrganizerId}
  GET {BASE_URL}/api/v1/tickets/admin/tickets
  GET {BASE_URL}/api/v1/tickets/reference{ref}
  admin:
  POST {BASE_URL}/
  POST {BASE_URL}/
  POST {BASE_URL}/
  POST {BASE_URL}/
  POST {BASE_URL}/
  POST {BASE_URL}/
  POST {BASE_URL}/
  Auth options: bearer token and cookies

## Formatting

- Prettier config: .prettierrc

## Deployment

- Environment: HOST Render
- Build command: npm install
- Start command: npm start
