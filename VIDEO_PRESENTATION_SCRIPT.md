# 5-Minute Project Demonstration Video Script
## Project: Disaster Relief & Resource Distribution Database
### Course: 23CSE202 Database Management Systems

---

## 🎥 Video Recording Setup Guide (OBS Studio)

You already have **OBS Studio** installed on your system (`/usr/bin/obs`).

### 1-Minute Setup in OBS:
1. Open OBS: run `obs` from your terminal or application launcher.
2. Under **Sources** (bottom panel), click **+** and add:
   - **Screen Capture (PipeWire / Wayland / XSHM)**: Select your main monitor showing the browser (`http://localhost:5173`).
   - **Video Capture Device (V4L2)**: Select your webcam.
3. **Position Webcam in Bottom Right**:
   - In the OBS canvas preview, click on your webcam source.
   - Resize it to a small box (approx. 20–25% of screen width) and drag it to the **bottom-right corner**.
4. In **Settings > Output**: set recording format to **MP4** or **MKV**.
5. Click **Start Recording** when ready!

---

## ⏱️ Minute-by-Minute Presentation Plan (5:00 Total)

```
0:00 - 0:45 | 1. Introduction, Course, & Problem Context
0:45 - 1:30 | 2. Home Screen, Authentication & Database Relational Schema
1:30 - 2:30 | 3. Dispatcher Dashboard & Nearest-Hub Stock Matching
2:30 - 3:30 | 4. Atomic Dispatch Transaction & Volunteer Conflict Prevention
3:30 - 4:30 | 5. Camp Manager Portal & 24-Hour Buffer Trigger Demo
4:30 - 5:00 | 6. Conclusion & DBMS Highlights (BCNF & Integrity)
```

---

## 🎙️ Spoken Script & Screen Actions

### [0:00 – 0:45] 1. Introduction & Problem Statement
- **On Screen**: Show the **Home / Login Screen** (`http://localhost:5173`). Your webcam should be visible in the bottom right corner.
- **What to Say**:
> *"Hello everyone and respected evaluators. My name is [Your Name], roll number [Your Roll No], presenting our DBMS project for 23CSE202: **Disaster Relief and Resource Distribution Database**.*
>
> *During natural disasters like floods, relief operations often suffer from critical misallocation: one camp might have surplus water while another nearby camp runs out of life-saving medicine. Our system solves this problem with a centralized, normalized database that connects regional coordinators, supply warehouses, camps, and volunteers into a single source of truth."*

---

### [0:45 – 1:30] 2. Home Page, RBAC, & Relational Schema
- **On Screen**: Show the **Login Page** with the email/password fields and Quick Demo Account buttons.
- **What to Say**:
> *"We begin on the Home Page. To ensure data security and integrity, the database enforces role-based access control with an `App_User` relation. Different stakeholders have distinct permissions: Regional Dispatchers coordinate logistics across the entire state, while Camp Managers only manage their own camp's inventory and requests.*
>
> *Under the hood, our schema consists of 8 core relations: `Relief_Camp`, `Supply_Hub`, `Inventory`, `Volunteer`, `Request`, `Dispatch`, `Dispatch_Item`, and `Camp_Inventory`. Every single relation is normalized to Boyce-Codd Normal Form (BCNF), eliminating redundancy, update anomalies, and deletion anomalies."*
- **Screen Action**: Click the **Dispatcher** demo button (`dispatcher@reliefops.org` / `admin123`) and click **Sign In**.

---

### [0:30 – 2:30] 3. Dispatcher Dashboard & Nearest-Hub Matching
- **On Screen**: The **Dispatcher Dashboard** loads showing live metrics, Critical Level Camps, and the Pending Request Queue.
- **What to Say**:
> *"Once logged in as Dispatcher, we have a birds-eye operational view. Notice the summary metrics at the top: critical camps, affected population, and pending requests.*
>
> *On the left, the **Critical Level Camps feed** displays shelters in urgent distress. This is not static data; it is powered by a real-time database trigger that evaluates survival stock.*
>
> *On the right, we have **Pending Request Matches**. When a camp raises an urgent request, our backend executes a spatial SQL matching query that joins `Request`, `Relief_Camp`, and `Inventory`. It calculates the surface distance between the requesting camp and every hub with sufficient stock, finding the optimal supply hub and estimating transit time in minutes."*

---

### [2:30 – 3:30] 4. Atomic Dispatch Transaction & Double-Booking Prevention
- **On Screen**: Navigate to the **Requests** tab in the sidebar (`http://localhost:5173` > Requests).
- **What to Say**:
> *"Now let's demonstrate the transactional dispatch process in the Requests section.*
>
> *Here we see pending request `REQ-1048` for 3,000 liters of potable water for East Ridge Camp, matched with East Logistics Yard. In the dispatch form below, I select this request and assign an available driver, Anita Rao.*
>
> *When I click **Confirm Dispatch**, the database executes an atomic transaction: it records the dispatch, decrements the available stock in the inventory batch, marks the request as 'in_transit', and changes Anita's status to 'assigned'.*
- **Screen Action**: Click **Confirm Dispatch**. Show the success message: `Dispatch confirmed`.
- **What to Say**:
> *"Now, let's test our integrity constraint. If another dispatcher tries to assign Anita Rao to a second delivery while she is already in transit..."*
- **Screen Action**: Attempt to dispatch Anita Rao or point to the volunteer roster.
- **What to Say**:
> *"...the database trigger immediately detects that Anita is already active on a dispatch and aborts the transaction with a 409 Conflict. This prevents human error and double-booking drivers in the field."*

---

### [3:30 – 4:30] 5. Camp Manager Workflow & 24-Hour Buffer Trigger
- **On Screen**: Log out, then log in as Camp Manager Maya Iyer (`maya@eastridge.org` / `camp123`).
- **What to Say**:
> *"Now let's switch perspective and log in as Camp Manager Maya Iyer, who is stationed at East Ridge Camp.*
>
> *Notice that the interface automatically adapts to Maya's assigned camp. Let's navigate to **Camp Stock**.*
>
> *In disaster management, SPHERE standards require a 24-hour buffer: at least 2 liters of water and 0.5 kilograms of food per person per day. East Ridge currently has 1,240 people. Right now, logged water is only 900 liters—well below the required 2,480-liter buffer. Because of this, our database trigger automatically marked this camp as 'Critical Level'.*
>
> *Watch what happens when a new relief delivery arrives on site. I'll log 3,000 liters of potable water."*
- **Screen Action**: In the Log Inventory form, enter: Item: `Potable Water`, Category: `Water`, Count: `3000`, Unit: `liters`. Click **Log Inventory**.
- **What to Say**:
> *"The moment the new stock is logged, the `trg_camp_inv_insert_check_buffer` trigger fires in the database. Since the camp now has a sufficient buffer for its population, its `StatusLevel` flips from 'Critical Level' back to 'Normal', immediately updating the dashboard."*

---

### [4:30 – 5:00] 6. Conclusion & DBMS Highlights
- **On Screen**: Navigate back to **All Camps** or switch back to the Dispatcher view. Look at the camera.
- **What to Say**:
> *"To summarize, our project demonstrates:
> 1. A strictly normalized **BCNF relational schema** across 8 tables.
> 2. **Automated business logic using SQL triggers** for threshold monitoring and double-booking prevention.
> 3. **ACID-compliant transactions** for stock deduction and dispatch tracking.
> 4. Full support for **PostgreSQL in pgAdmin 4**, complete with stored procedures and visual ER diagrams.
>
> *Thank you very much for your time and evaluation!"*

---

## 💡 Quick Tips for a High Score
1. **Pacing**: Speak at a steady, clear conversational pace. Don't rush! 5 minutes is plenty of time for this script.
2. **Webcam**: Ensure your webcam is well-lit and in the **bottom-right corner** throughout the entire video as required by the instruction.
3. **Dry Run**: Do a 2-minute test recording first to verify that your microphone audio is clear and the screen capture is sharp.
