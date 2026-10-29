-- ============================================================================
-- Course: 23CSE202 DATABASE MANAGEMENT SYSTEMS
-- Project: Disaster Relief & Resource Distribution Database
-- Engine: PostgreSQL (pgAdmin Analytical & Reporting Queries)
-- ============================================================================

-- Query 1: Nearest Stocked Hub Matching for Pending Requests
SELECT 
    r.RequestID,
    r.ItemCategory,
    r.ItemName,
    r.QuantityRequested,
    r.Unit,
    r.UrgencyLevel,
    c.CampName,
    c.Location AS CampLocation,
    sh.HubID,
    sh.HubName,
    inv.QuantityAvailable AS StockAtHub,
    ROUND(
        (111.0 * SQRT(
            POWER(sh.Latitude - c.Latitude, 2) +
            POWER((sh.Longitude - c.Longitude) * COS(RADIANS(c.Latitude)), 2)
        ))::numeric, 1
    ) AS DistanceKm,
    ROUND(
        ((111.0 * SQRT(
            POWER(sh.Latitude - c.Latitude, 2) +
            POWER((sh.Longitude - c.Longitude) * COS(RADIANS(c.Latitude)), 2)
        ) / 25.0) * 60 + 15)::numeric
    ) AS EstimatedTransitMinutes
FROM Request r
JOIN Relief_Camp c ON r.CampID = c.CampID
JOIN Inventory inv ON inv.ItemName = r.ItemName AND inv.QuantityAvailable >= r.QuantityRequested
JOIN Supply_Hub sh ON inv.HubID = sh.HubID
WHERE r.Status = 'pending'
ORDER BY 
    CASE r.UrgencyLevel 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
    END,
    DistanceKm ASC;

-- Query 2: 24-Hour Buffer Deficit Analysis per Camp
SELECT 
    c.CampID,
    c.CampName,
    c.CurrentPopulation,
    c.StatusLevel,
    COALESCE(water.Count, 0) AS CurrentWaterLiters,
    (c.CurrentPopulation * 2.0) AS RequiredWater24HrBuffer,
    CASE 
        WHEN COALESCE(water.Count, 0) < (c.CurrentPopulation * 2.0)
        THEN (c.CurrentPopulation * 2.0) - COALESCE(water.Count, 0)
        ELSE 0
    END AS WaterDeficitLiters,
    COALESCE(food.Count, 0) AS CurrentFoodKg,
    (c.CurrentPopulation * 0.5) AS RequiredFood24HrBuffer,
    CASE 
        WHEN COALESCE(food.Count, 0) < (c.CurrentPopulation * 0.5)
        THEN (c.CurrentPopulation * 0.5) - COALESCE(food.Count, 0)
        ELSE 0
    END AS FoodDeficitKg
FROM Relief_Camp c
LEFT JOIN Camp_Inventory water ON c.CampID = water.CampID AND water.Category = 'Water'
LEFT JOIN Camp_Inventory food ON c.CampID = food.CampID AND food.Category = 'Food';

-- Query 3: Perishable Stock Expiry and Depletion Report
SELECT 
    sh.HubName,
    inv.ItemID,
    inv.ItemName,
    inv.Category,
    inv.ShelfLifeCategory,
    inv.QuantityAvailable,
    inv.Threshold,
    inv.CriticalThreshold,
    inv.ShelfLifeDate,
    CASE 
        WHEN inv.QuantityAvailable <= inv.CriticalThreshold THEN 'CRITICAL DEPLETION'
        WHEN inv.QuantityAvailable <= inv.Threshold THEN 'LOW STOCK WARNING'
        ELSE 'STABLE'
    END AS StockHealthStatus
FROM Inventory inv
JOIN Supply_Hub sh ON inv.HubID = sh.HubID
ORDER BY inv.ShelfLifeDate ASC, inv.QuantityAvailable ASC;

-- Query 4: Volunteer Roster and Active Missions
SELECT 
    v.VolunteerID,
    v.Name AS VolunteerName,
    v.Phone,
    v.VehicleAccess,
    v.AssignedZone,
    v.Availability,
    d.DispatchID,
    d.RequestID,
    c.CampName AS DestinationCamp,
    d.DispatchDate
FROM Volunteer v
LEFT JOIN Dispatch d ON v.VolunteerID = d.VolunteerID AND d.TransitStatus IN ('in_transit', 'pending')
LEFT JOIN Relief_Camp c ON d.CampID = c.CampID
ORDER BY v.Availability, v.Name;

-- Query 5: Full Supply Chain Traceability (Lossless Join Audit)
SELECT 
    d.DispatchID,
    d.DispatchDate,
    d.TransitStatus,
    req.RequestID,
    req.UrgencyLevel,
    sh.HubName AS OriginHub,
    c.CampName AS DestinationCamp,
    v.Name AS DriverVolunteer,
    inv.ItemName,
    di.QuantityDispatched,
    inv.Unit
FROM Dispatch d
JOIN Request req ON d.RequestID = req.RequestID
JOIN Supply_Hub sh ON d.HubID = sh.HubID
JOIN Relief_Camp c ON d.CampID = c.CampID
JOIN Volunteer v ON d.VolunteerID = v.VolunteerID
JOIN Dispatch_Item di ON d.DispatchID = di.DispatchID
JOIN Inventory inv ON di.ItemID = inv.ItemID
ORDER BY d.DispatchDate DESC;
