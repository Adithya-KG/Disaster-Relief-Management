# VIDEO DEMONSTRATION: WHAT TO DO (STEP-BY-STEP GUIDE)
Project: Disaster Relief & Resource Distribution Database (23CSE202)

This guide tells you **exactly what to set up, click, and do** while speaking the script in `SPOKEN_SCRIPT.md`.

---

## 🛠️ Step 1: Pre-Recording Setup (2 Minutes)

Before opening your screen recorder:

### 1. Reset Database to Clean State
Open a terminal in `~/misc/dbms/Disaster-Relief-Management`:
```bash
npm run db:setup
```
*(This ensures East Ridge is at Critical Level and Anita Rao is available for dispatch).*

### 2. Start the Backend API Server
In Terminal 1:
```bash
npm run server
```
*(Leave running; outputs `Disaster Relief Backend API running on http://localhost:8080`).*

### 3. Start the Frontend Application
In Terminal 2:
```bash
npm run dev
```

### 4. Open the Web Browser
Open Chrome/Firefox and go to:
👉 **`http://localhost:5173`**
*(You will see the ReliefOps Home / Login screen with the Quick Demo Account buttons).*

---

## 📹 Step 2: OBS Studio Camera & Screen Setup

> [!IMPORTANT]
> **Assignment Requirement**: Your face **MUST be visible in the bottom right corner** of the video throughout the recording.

1. Open **OBS Studio**:
   - Run `obs` from your terminal or application launcher.
2. Under the **Sources** box at the bottom, click the **`+`** icon:
   - Choose **Screen Capture (PipeWire / Wayland / XSHM)** -> Select your main display showing `http://localhost:5173`.
3. Click **`+`** again:
   - Choose **Video Capture Device (V4L2)** -> Select your webcam.
4. **Position the Camera**:
   - Click your camera box in the OBS preview window.
   - Resize it to a neat rectangle (about 20% to 25% of the screen size).
   - Drag it to the **BOTTOM RIGHT CORNER**.
5. Check your microphone:
   - Speak a few words and verify the green audio bar moves in OBS.
6. In **Settings > Output**, verify Recording Format is **mp4**.

---

## 🎬 Step 3: Exact Click-by-Click Action Plan (Synchronized with Script)

Keep [`SPOKEN_SCRIPT.md`](file:///home/piezuke/misc/dbms/Disaster-Relief-Management/SPOKEN_SCRIPT.md) on your phone or on the side of your screen. Follow this timeline:

| Time | Script Part | What to Do On Screen (Your Actions) |
|---|---|---|
| **0:00 – 0:45** | **Part 1: Intro** | • Stay on the **Home / Login Screen** (`http://localhost:5173`).<br>• Look directly at the webcam.<br>• Introduce yourself, roll number, and project title. |
| **0:45 – 1:30** | **Part 2: Home Page & Schema** | • Hover your mouse over the Email and Password fields.<br>• Point cursor to the Quick Demo Account buttons.<br>• Click the **Dispatcher** demo button (`dispatcher@reliefops.org`).<br>• Click **Sign In**. |
| **1:30 – 2:30** | **Part 3: Dispatcher Dashboard** | • Point your mouse at the top **4 Metric Cards**.<br>• Move cursor to **Critical Level Camps** list on the left (East Ridge & Hillview).<br>• Move cursor to **Pending Request Matches** on the right.<br>• Highlight request `REQ-1048` showing distance (5.2 km) and ETA (27 min). |
| **2:30 – 3:30** | **Part 4: Truck Dispatch & Trigger** | • In the left sidebar, click **Requests**.<br>• Scroll down to **Dispatch Truck**.<br>• Pending request dropdown: select `REQ-1048` (East Ridge / Potable Water).<br>• Volunteer dropdown: select `Anita Rao / Truck / East`.<br>• Click **Confirm Dispatch** -> show green message *"Dispatch confirmed"*.<br>• Point out that Anita is now assigned and stock is deducted. |
| **3:30 – 4:30** | **Part 5: Camp Manager & Buffer Trigger** | • Click **Logout** at bottom-left of sidebar.<br>• On login screen, click **East Ridge Mgr** demo button (`maya@eastridge.org`).<br>• Click **Sign In**.<br>• In left sidebar, click **Inventory**.<br>• Point to the top **Assigned Camp Buffer Monitor**: East Ridge shows **Critical Level** (900L < 2,480L needed).<br>• In **Inventory Entry** form on the right, enter: `Potable Water`, Category: `Water`, Count: `3000`, Unit: `liters`.<br>• Click **Log Inventory**.<br>• Point out that the top monitor badge immediately flips from **Critical Level** to **Normal** (Buffer Satisfied)! |
| **4:30 – 5:00** | **Part 6: Conclusion** | • Click **Camps** in the sidebar, or stay on dashboard.<br>• Look directly into your webcam in the bottom-right corner.<br>• Deliver the conclusion summary and say *"Thank you!"*.<br>• Switch to OBS and click **Stop Recording**. |

---

## ✅ Step 4: Submission Checklist

Before submitting your recorded video:
- [ ] **Video length**: Between **4:45 and 5:15 minutes** (strictly adhering to the 5-min target).
- [ ] **Face visible**: Your face is clearly visible in the **bottom-right corner** from start to finish.
- [ ] **Home page start**: The video started from the Home / Login screen.
- [ ] **Audio clarity**: Voice is clearly audible with no heavy background noise.
- [ ] **Both roles shown**: Both Dispatcher (system view) and Camp Manager (camp view) were demonstrated.
