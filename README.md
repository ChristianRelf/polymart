

![POLYMART Logo](./public/polymartlogo.png)

**POLYMART** is a real-time stock market simulation engine designed primarily as a **synthetic data generator** for financial applications, experiments, and creative projects.

It provides a fully programmable environment for generating realistic, evolving stock market data that can be used across a wide range of use cases - from lightweight bots to full-scale training platforms.

---

## 🧠 What This Project Is

POLYMART is a **self-contained market simulation system** built to:

- Generate **synthetic stock market data** over time  
- Serve as **training data** for models, strategies, and applications  
- Provide a controllable environment for **testing and experimentation**  
- Act as a backend for projects that need **live-like financial data without real markets**

This is not a production trading engine - it is a **data generation and simulation platform**.

---

## 🎯 Primary Purpose

At its core, POLYMART exists to **create usable, dynamic stock data**.

This data can power:

- 🤖 Discord bots that simulate trading or market tracking  
- 🧪 Algorithmic trading experiments  
- 🎓 Stock market learning and training platforms  
- 📊 Data visualization tools  
- 🕹️ Games or gamified trading environments  
- 🧠 Machine learning datasets for financial models  

If you need **market-like behavior without relying on real-world APIs**, POLYMART fills that gap.

---

## ⚙️ How It Works

### 📈 Market Simulation
A synthetic market evolves over time, with prices changing based on internal logic and system rules.

### 🔁 Tick Engine
A scheduled backend process (`polymart-tick`) continuously updates:
- Prices
- Market state
- Simulation progression

### 🔌 API Layer
The `polymart-api` exposes the simulation for external use:
- Retrieve generated stock data
- Hook into the simulation from external apps
- Drive integrations (bots, dashboards, etc.)

### 🧩 Frontend
A web interface allows:
- Visualization of the simulated market
- Interaction with the system
- Exploration of generated data

### 🗄️ Data Persistence
Backed by Supabase for:
- Storing generated market data
- Maintaining simulation continuity
- Managing schema evolution





---

## 🔍 Key Features

- Synthetic **stock market data generation**
- Continuous **tick-based simulation engine**
- API-first design for **external integrations**
- Supabase-backed **persistent data layer**
- Flexible architecture for experimentation
- Built-in frontend for visualization and testing

---

## 🧪 Intended Use Cases

POLYMART is designed to be used as a **data backbone**, not just a standalone app.

Examples include:

- A Discord bot that lets users “trade” fake stocks  
- A classroom tool for teaching market dynamics  
- A sandbox for testing trading algorithms  
- A backend for a stock market game  
- A dataset generator for ML/AI financial models  

---

## ⚠️ Important Notes

- ❌ Not connected to real financial markets  
- ❌ Not suitable for real trading or financial decisions  
- ⚠️ Data is simulated and may not reflect real-world behavior  
- 🔒 This project is not intended to be a reusable framework or library  

---

## 📜 Legal

By using any POLYMART-related services or outputs, you agree to the following:

- **Terms of Service**: https://www.polymart.co/#/docs/terms  
- **Privacy Policy**: https://www.polymart.co/#/docs/privacy  

---

## 🌐 Official Site

- https://www.polymart.co/

---

## 💡 Vision

POLYMART explores the idea that **financial systems don’t need to be real to be useful**.

By generating realistic, controllable market data, it enables developers, researchers, and creators to build and experiment freely - without external dependencies or real-world risk.
