// Haversine formula
export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export const optimizeDeliveryRoute = async (agentLat, agentLng, orders) => {
  let unvisitedTasks = [];
  orders.forEach(o => {
    if (o.status === "assigned") {
      unvisitedTasks.push({ type: "pickup", order: o, orderId: o._id.toString() });
      unvisitedTasks.push({ type: "delivery", order: o, orderId: o._id.toString() });
    } else if (o.status === "picked_up") {
      unvisitedTasks.push({ type: "delivery", order: o, orderId: o._id.toString() });
    }
  });

  if (unvisitedTasks.length === 0) return { optimized: [], totalDistance: 0 };

  // Collect all unique coordinates to build a distance matrix
  const coords = [{ lat: parseFloat(agentLat), lng: parseFloat(agentLng), id: "agent" }];
  
  unvisitedTasks.forEach((task, idx) => {
    const o = task.order;
    const lat = task.type === "pickup" ? (o.pickupLatitude || o.order?.farmer?.latitude || 0) : (o.deliveryLatitude || 0);
    const lng = task.type === "pickup" ? (o.pickupLongitude || o.order?.farmer?.longitude || 0) : (o.deliveryLongitude || 0);
    task.lat = lat;
    task.lng = lng;
    task.matrixIdx = coords.length;
    coords.push({ lat, lng, id: `task_${idx}` });
  });

  // Fetch real driving distances from OSRM Table API
  let distanceMatrix = [];
  try {
    const coordString = coords.map(c => `${c.lng},${c.lat}`).join(";");
    // OSRM Public API limits to 100 coordinates, our payload is typically < 20
    const url = `http://router.project-osrm.org/table/v1/driving/${coordString}?annotations=distance`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === "Ok" && data.distances) {
      distanceMatrix = data.distances; // distances in meters
    }
  } catch (err) {
    console.error("OSRM Table API Error, falling back to Haversine:", err);
  }

  // Helper to get distance between two matrix indices
  const getRouteDistance = (fromIdx, toIdx) => {
    if (distanceMatrix.length > 0 && distanceMatrix[fromIdx] && distanceMatrix[fromIdx][toIdx] !== undefined) {
      return distanceMatrix[fromIdx][toIdx] / 1000; // convert meters to km
    }
    // Fallback to Haversine
    return getDistance(coords[fromIdx].lat, coords[fromIdx].lng, coords[toIdx].lat, coords[toIdx].lng);
  };

  const optimized = [];
  let totalDistance = 0;
  let currentMatrixIdx = 0; // Starts at agent (index 0)
  const completedPickups = new Set();

  while (unvisitedTasks.length > 0) {
    let nearestIdx = -1;
    let minDistance = Infinity;
    
    for (let i = 0; i < unvisitedTasks.length; i++) {
      const task = unvisitedTasks[i];
      
      // Enforce Pickup and Delivery precedence
      if (task.type === "delivery" && task.order.status === "assigned" && !completedPickups.has(task.orderId)) {
        continue;
      }
      
      const dist = getRouteDistance(currentMatrixIdx, task.matrixIdx);
      const bundledDist = dist < 2 ? dist * 0.1 : dist; // Discount for clustered tasks

      if (bundledDist < minDistance) {
        minDistance = bundledDist;
        nearestIdx = i;
      }
    }
    
    if (nearestIdx === -1) break; 
    
    const nearestTask = unvisitedTasks.splice(nearestIdx, 1)[0];
    const o = nearestTask.order;
    const isPickup = nearestTask.type === "pickup";
    
    if (isPickup) completedPickups.add(nearestTask.orderId);
    
    const actualDist = getRouteDistance(currentMatrixIdx, nearestTask.matrixIdx);

    optimized.push({
      action: isPickup ? "Pickup" : "Deliver",
      location: (isPickup ? o.pickupLocation : o.deliveryLocation) || "Unknown Location",
      deliveryId: o._id,
      trackingCode: o.trackingCode
    });
    
    totalDistance += actualDist;
    currentMatrixIdx = nearestTask.matrixIdx;
  }
  
  return { optimized, totalDistance };
};