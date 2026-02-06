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
