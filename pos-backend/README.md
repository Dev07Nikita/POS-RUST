# Safi POS System

A modern, offline-capable Point of Sale system built with **Spring Boot** and **SQLite**.

## Tech Stack
- **Backend**: Java 17, Spring Boot 3.2.2, Spring Data JPA.
- **Database**: SQLite (Local file `pos.db`).
- **Frontend**: Vanilla JS + Tailwind CSS (No Node.js required).
- **Payments**: Integrated skeletons for M-Pesa, Equity, and KCB.

## How to Run
1. Ensure you have **Java 17** installed.
2. Open the terminal in the `pos-backend` folder.
3. Run the application:
   ```cmd
   ./mvnw spring-boot:run
   ```
4. Open your browser to `http://localhost:8080`.

## Features
- **Modern Interface**: Premium dark-mode dashboard with glassmorphism effects.
- **Offline Persistence**: Uses SQLite to store all transactions locally.
- **M-Pesa Ready**: STK Push integration logic included.
- **Bank Integrations**: Skeletons for Equity Jenga and KCB BUNI APIs.
- **Receipts**: Automated text-based receipt generation.

## Configuration
Update `src/main/resources/application.properties` to change the database file name or port.

### M-Pesa (Daraja API)
For real STK Push payments:
1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke) and create a sandbox app to get **Consumer Key** and **Consumer Secret**.
2. In the Daraja portal, open **APIs → Simulate** to get your **Passkey** (sandbox).
3. Set the **callback URL** to a publicly reachable URL (M-Pesa cannot call localhost). Use [ngrok](https://ngrok.com) for local testing: run `ngrok http 8080` and set `MPESA_CALLBACK_URL=https://your-subdomain.ngrok.io/api/mpesa/callback`.
4. Configure via environment variables or `application.properties`:
   - `mpesa.consumer.key`, `mpesa.consumer.secret`, `mpesa.passkey`, `mpesa.callback.url`
   - Optional: `mpesa.environment=production` and production credentials when going live.
