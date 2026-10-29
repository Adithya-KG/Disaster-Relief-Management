# Finalized 5-Minute Presentation Script (Reset & Verified)
**Presenter:** Adithya Boby (Roll No: AM.SC.U4CSE25012)  
**Project:** Disaster Relief & Resource Distribution Database (23CSE202)  
**Initial State:** Database freshly reset with `npm run db:setup`.

---

### [0:00 – 0:30] 1. INTRODUCTION
**Screen:** Home / Login Page (`http://localhost:5173`). Look at webcam in bottom-right corner.

> "Hello everyone, my name is **Adithya Boby**, roll number **AM.SC.U4CSE25012**. Today I am presenting our DBMS project: the **Disaster Relief and Resource Distribution Database** for course 23CSE202.
>
> During natural disasters like floods, relief operations are often uncoordinated. One camp might have excess aid while another runs out of basic drinking water. Our project provides a centralized, normalized relational database and live operations dashboard connecting camps, warehouses, and volunteers into a single source of truth."

---

### [0:30 – 1:00] 2. HOME SCREEN & ROLE-BASED LOGIN
**Screen Action:** Point mouse to Login form with the Quick Demo Account buttons. Click **Dispatcher** (`dispatcher@reliefops.org`) and click **Sign In**.

> "Starting on our Home Page, the system uses role-based access control with an `App_User` relation. We have two main roles:
> 
> Regional Dispatchers, who manage region-wide logistics, and Camp Managers, who only manage their assigned shelter.
> 
> Let's sign in first as the **Regional Dispatcher** using our demo credentials."

---

### [1:00 – 1:50] 3. DISPATCHER DASHBOARD & SMART STOCK MATCHING
**Screen Action:** Point cursor across the top 4 metric cards, then to the **Critical Level Camps** list on the left, then to the **Pending Request Matches** table on the right.

> "On the Dispatcher Dashboard, we see real-time metrics: 2 critical camps, over 2,200 affected people, and 3 pending requests.
>
> On the left is the **Critical Camps feed**. These shelters are flagged automatically by database triggers whenever on-site survival supplies drop below safety buffers.
>
> On the right, our database runs a spatial SQL matching query. Notice Request `REQ-1048` from East Ridge Camp needing 3,000 liters of water: the database automatically identifies North Supply Hub as the nearest stocked location—just 5.2 kilometers away, with an estimated delivery time of 27 minutes."

---

### [1:50 – 2:50] 4. TRUCK DISPATCH & VOLUNTEER ASSIGNMENT
**Screen Action:** Click **Requests** in the left sidebar. Scroll down to **Dispatch Truck**:
1. Pending request dropdown: select `REQ-1048 / East Ridge Camp / Potable Water`.
2. Available volunteer dropdown: select `Anita Rao / Truck / East`.
3. Click **Confirm Dispatch** → point to green banner: *"Dispatch confirmed"*.

> "Now let's fulfill this need in the **Requests** tab.
>
> In the 'Dispatch Truck' section, I select East Ridge's water request, and assign an available driver with a heavy vehicle—Anita Rao.
>
> When I click **Confirm Dispatch**, the database executes an atomic ACID transaction: it records the delivery, decrements warehouse inventory stock, marks the request as in-transit, and updates Anita's availability to assigned.
>
> Our database trigger also prevents double-booking: if another operator attempts to schedule Anita again while she is already in transit, the transaction is rejected."

---

### [2:50 – 4:05] 5. CAMP MANAGER & 24-HOUR BUFFER TRIGGER DEMO
**Screen Action:**
1. Click **Logout** at the bottom-left of the sidebar.
2. Click **East Ridge Mgr** demo button (`maya@eastridge.org` / `camp123`).
3. Click **Sign In**.
4. In sidebar, click **Inventory** to view Camp Stock & Buffer Monitor.

> "Now let's switch perspective. I'll log out and sign in as **Camp Manager Maya Iyer** at East Ridge Camp.
>
> On the **Camp Inventory** page, you can see our **Assigned Camp Buffer Monitor**. East Ridge is currently marked **Critical Level**. According to relief guidelines, 1,240 people require a 24-hour buffer of 2,480 liters of water. Currently, only 900 liters are logged, which is why the database flagged this camp as critical.
>
> Now, suppose a new delivery truck arrives with water. I will log 3,000 liters of potable water."

**Screen Action:** In the Inventory Entry form on the right:
- Item: `Potable Water`
- Category: `Water`
- Count: `3000`
- Unit: `liters`
- Click **Log Inventory**. Point to the updated table (3,000 L) and the top Buffer Monitor where the badge immediately flips from **Critical Level** to **Normal** (Buffer Satisfied)!

> "The moment I submit, our database trigger `trg_camp_inv_update_check_buffer` recalculates the survival buffer. Because the camp now has enough water for its population, its status automatically resolves from **Critical Level** back to **Normal** across the entire system."

---

### [4:05 – 4:35] 6. CONCLUSION & TECHNICAL SUMMARY
**Screen Action:** Click **Camps** in the sidebar, or return to dashboard. Look at webcam.

> "To conclude, our project demonstrates:
> 1. A strictly normalized BCNF relational schema across 8 entities.
> 2. Automated SQL triggers for survival buffers and conflict prevention.
> 3. ACID transactions for real-time inventory deductions.
> 4. Full enterprise compatibility with PostgreSQL in pgAdmin 4.
>
> Thank you very much for your time!"
