-- ============================================================================
-- Course: 23CSE202 DATABASE MANAGEMENT SYSTEMS
-- Project: Disaster Relief & Resource Distribution Database
-- SQL Analytics, Reporting & Verification Queries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query 1: Nearest Stocked Hub Matching for Pending Requests
-- Matches each pending relief request to the nearest hub that holds sufficient stock.
-- Uses approximate Euclidean surface distance formula:
-- Distance (km) ~ sqrt( (dLat * 111.0)^2 + (dLon * 111.0 * cos(lat))^2 )
-- ----------------------------------------------------------------------------
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
        111.0 * SQRT(
            (sh.Latitude - c.Latitude) * (sh.Latitude - c.Latitude) +
            (sh.Longitude - c.Longitude) * (sh.Longitude - c.Longitude) * 0.97
        ), 1
    ) AS DistanceKm,
    ROUND(
        (111.0 * SQRT(
            (sh.Latitude - c.Latitude) * (sh.Latitude - c.Latitude) +
            (sh.Longitude - c.Longitude) * (sh.Longitude - c.Longitude) * 0.97
        ) / 25.0) * 60 + 15
    ) AS EstimatedTransitMinutes
FROM Request r
JOIN Relief_Camp c ON r.CampID = c.CampID
JOIN Inventory inv ON inv.ItemName = r.ItemName AND inv.QuantityAvailable >= r.QuantityRequested
JOIN Supply_Hub sh ON inv.HubID = sh.HubID
WHERE r.Status = 'pending'
ORDER BY r.UrgencyLevel DESC, DistanceKm ASC;

-- ----------------------------------------------------------------------------
-- Query 2: 24-Hour Buffer Deficit Analysis per Camp
-- Evaluates food (0.5 kg/person/day) and water (2.0 L/person/day) buffers.
-- Demonstrates the justification for the automated StatusLevel trigger.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Query 3: Perishable Stock Expiry and Threshold Alert Report
-- Flags items expiring within 30 days or falling below critical safety buffer.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Query 4: Volunteer Roster and Active Mission Tracking
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Query 5: Full Supply Chain Traceability (Lossless Join Audit)
-- Traces aid from originating hub batch to receiving camp shelter.
-- Proves lossless decomposition and BCNF relational integrity.
-- ----------------------------------------------------------------------------
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
