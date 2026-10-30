-- Relief Camps
INSERT INTO Relief_Camp (CampID, CampName, Location, Latitude, Longitude, CurrentPopulation, Capacity, ContactName, ContactPhone, ContactInfo, Zone, StatusLevel, LastUpdated)
VALUES
('camp-east-ridge', 'East Ridge Camp', 'East Ridge High School, Ward 8', 9.9816, 76.2999, 1240, 1400, 'Maya Iyer', '+91 98765 01010', 'Maya Iyer (+91 98765 01010)', 'East', 'Critical Level', '2026-08-05 08:10:00+05:30'),
('camp-riverbend', 'Riverbend Shelter', 'Riverbend Community Hall', 9.9312, 76.2673, 680, 900, 'Omar Khan', '+91 98765 01011', 'Omar Khan (+91 98765 01011)', 'South', 'Normal', '2026-08-05 08:18:00+05:30'),
('camp-hillview', 'Hillview Transit Camp', 'Hillview Stadium Gate 2', 10.0150, 76.3240, 970, 1000, 'Leela Menon', '+91 98765 01012', 'Leela Menon (+91 98765 01012)', 'North', 'Critical Level', '2026-08-05 08:22:00+05:30');

-- Supply Hubs
INSERT INTO Supply_Hub (HubID, HubName, Location, Latitude, Longitude, Zone, Capacity, ContactInfo)
VALUES
('hub-north', 'North Supply Hub', 'North Container Terminal, Aluva Road', 10.0280, 76.3080, 'North', 50000, 'Logistics Officer A (+91 98765 02001)'),
('hub-east', 'East Logistics Yard', 'Kakkanad Bypass Yard 4', 9.9980, 76.3550, 'East', 75000, 'Logistics Officer B (+91 98765 02002)'),
('hub-south', 'South Medical Depot', 'Vyttila Mobility Depot', 9.9670, 76.3180, 'South', 60000, 'Medical Logistics Officer (+91 98765 02003)');

-- Hub Inventory
INSERT INTO Inventory (ItemID, HubID, ItemName, Category, ShelfLifeCategory, QuantityAvailable, Threshold, CriticalThreshold, Unit, ShelfLifeDate)
VALUES
('inv-001', 'hub-east', 'Potable Water', 'Water', 'Short', 9200, 5000, 2500, 'liters', '2026-08-28'),
('inv-002', 'hub-east', 'Rice Rations', 'Food', 'Medium', 1800, 2000, 900, 'kg', '2026-11-20'),
('inv-003', 'hub-north', 'ORS Sachets', 'Medical', 'Short', 620, 900, 400, 'packs', '2026-09-15'),
('inv-004', 'hub-south', 'Blankets', 'Shelter', 'Long', 4300, 1500, 700, 'units', '2030-01-01'),
('inv-005', 'hub-north', 'Infant Formula', 'Food', 'Short', 320, 500, 250, 'tins', '2026-10-03'),
('inv-006', 'hub-north', 'Potable Water', 'Water', 'Short', 6500, 4000, 2000, 'liters', '2026-09-02'),
('inv-007', 'hub-south', 'First Aid Kits', 'Medical', 'Medium', 850, 500, 200, 'units', '2027-05-15');

-- Volunteers
INSERT INTO Volunteer (VolunteerID, Name, Phone, Skills, VehicleAccess, AssignedZone, Availability)
VALUES
('vol-101', 'Anita Rao', '+91 98765 03001', 'Heavy vehicle, Radio', 'Truck', 'East', 'available'),
('vol-102', 'Kiran Das', '+91 98765 03002', 'Paramedic, Navigation', 'Van', 'North', 'available'),
('vol-103', 'Farah Ali', '+91 98765 03003', 'Forklift, Inventory', 'Truck', 'South', 'available'),
('vol-104', 'Rohan Sen', '+91 98765 03004', 'First aid, Translation', 'None', 'East', 'standby');

-- Requests
INSERT INTO Request (RequestID, CampID, ItemCategory, ItemName, QuantityRequested, Unit, UrgencyLevel, RequestDate, Status)
VALUES
('REQ-1039', 'camp-riverbend', 'Medical', 'First Aid Kits', 150, 'units', 'high', '2026-08-05 07:15:00+05:30', 'pending'),
('REQ-1048', 'camp-east-ridge', 'Water', 'Potable Water', 3000, 'liters', 'critical', '2026-08-05 08:08:00+05:30', 'pending'),
('REQ-1049', 'camp-hillview', 'Medical', 'ORS Sachets', 500, 'packs', 'high', '2026-08-05 08:16:00+05:30', 'pending'),
('REQ-1050', 'camp-riverbend', 'Shelter', 'Blankets', 300, 'units', 'medium', '2026-08-05 08:24:00+05:30', 'pending');

-- Dispatches
INSERT INTO Dispatch (DispatchID, RequestID, HubID, CampID, VolunteerID, DispatchDate, TransitStatus)
VALUES
('DSP-1039', 'REQ-1039', 'hub-south', 'camp-riverbend', 'vol-103', '2026-08-05 07:30:00+05:30', 'in_transit');

INSERT INTO Dispatch_Item (DispatchID, ItemID, QuantityDispatched)
VALUES
('DSP-1039', 'inv-007', 150);

-- Camp Inventory
INSERT INTO Camp_Inventory (InventoryID, CampID, ItemName, Category, Count, Unit, LastLogged)
VALUES
('camp-inv-001', 'camp-east-ridge', 'Potable Water', 'Water', 900, 'liters', '2026-08-05 07:50:00+05:30'),
('camp-inv-002', 'camp-east-ridge', 'Rice Rations', 'Food', 700, 'kg', '2026-08-05 07:46:00+05:30'),
('camp-inv-003', 'camp-riverbend', 'Blankets', 'Shelter', 480, 'units', '2026-08-05 07:35:00+05:30'),
('camp-inv-004', 'camp-riverbend', 'Potable Water', 'Water', 2500, 'liters', '2026-08-05 07:40:00+05:30'),
('camp-inv-005', 'camp-riverbend', 'Rice Rations', 'Food', 600, 'kg', '2026-08-05 07:42:00+05:30'),
('camp-inv-006', 'camp-hillview', 'Potable Water', 'Water', 500, 'liters', '2026-08-05 07:55:00+05:30');

-- Users
INSERT INTO App_User (UserID, Email, Password, FullName, Role, AssignedCampID)
VALUES
('usr-001', 'dispatcher@reliefops.org', 'admin123', 'Regional Dispatcher', 'dispatcher', NULL),
('usr-002', 'maya@eastridge.org', 'camp123', 'Maya Iyer', 'camp_manager', 'camp-east-ridge'),
('usr-003', 'omar@riverbend.org', 'camp123', 'Omar Khan', 'camp_manager', 'camp-riverbend'),
('usr-004', 'leela@hillview.org', 'camp123', 'Leela Menon', 'camp_manager', 'camp-hillview'),
('usr-005', 'admin@reliefops.org', 'admin123', 'System Administrator', 'dispatcher', NULL);
