# Restaurant Intelligence API - Quick Reference

## New Endpoint

### GET /api/restaurant/insights

Comprehensive restaurant analytics dashboard with 7 key metrics.

**Request:**
```http
GET /api/restaurant/insights HTTP/1.1
Host: your-backend.com
Authorization: Bearer YOUR_JWT_TOKEN (optional, uses middleware placeholders)
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "topSellingToday": {
      "itemName": "Pizza Margherita",
      "totalSold": 15
    },
    "repeatRate": 45.5,
    "averagePrepTimeMinutes": 28,
    "weeklyGrowth": 12.5,
    "revenueTrend": [
      {
        "_id": "2026-02-01",
        "total": 5420.50
      },
      {
        "_id": "2026-02-02",
        "total": 6850.75
      },
      // ... 28 more days
    ],
    "suggestedInsights": [
      "Top item today: Pizza Margherita (15 sold)",
      "Strong repeat customer rate: 45.5%",
      "Revenue growing: +12.5% week-over-week"
    ]
  }
}
```

---

## Enhanced Endpoints

### GET /api/restaurant/analytics

Now returns **4 new fields** in addition to existing metrics.

**New Fields in Response:**
```json
{
  "success": true,
  "data": {
    "dailyRevenue": [...],      // Existing
    "topItems": [...],           // Existing
    "ordersByStatus": [...],     // Existing
    "repeatRate": 45.5,          // NEW
    "averagePrepTimeMinutes": 28, // NEW
    "weeklyGrowth": 12.5         // NEW - includes thisWeekRevenue comparison
  }
}
```

---

### POST /api/restaurant/orders

Now includes **suggestedItems** array in response.

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "orderId": "PF1A2B3C",
    "total": 450,
    "status": "PENDING",
    "estimatedMinutes": 22,
    "estimatedCompletionTime": "2026-03-01T12:30:00Z",
    "suggestedItems": [
      {
        "name": "Garlic Bread",
        "category": "Appetizers",
        "price": 150
      },
      {
        "name": "Coca Cola 500ml",
        "category": "Beverages",
        "price": 80
      },
      {
        "name": "Chocolate Cake",
        "category": "Desserts",
        "price": 120
      }
    ]
  }
}
```

---

## Socket Events (Real-time Updates)

### Event: restaurant:top-item-update

**Trigger:** When any order is marked as COMPLETED

**Payload:**
```json
{
  "itemName": "Pizza Margherita",
  "totalSold": 15
}
```

**Listen (Client-side):**
```javascript
socket.on('restaurant:top-item-update', (data) => {
  console.log(`Today's top seller: ${data.itemName} (${data.totalSold} sold)`);
});
```

---

## Metric Definitions

| Metric | Calculation | Usage |
|--------|-----------|-------|
| **topSellingToday** | Top item by quantity sold today | Display popular item, adjust stock |
| **repeatRate** | (Repeat Customers / Total Customers) × 100 | Customer retention KPI |
| **averagePrepTimeMinutes** | Avg(completedAt - acceptedAt) for last 7 days | Performance tracking |
| **weeklyGrowth** | ((This Week - Last Week) / Last Week) × 100 | Revenue momentum indicator |
| **revenueTrend** | Daily revenue sums for last 30 days | Graphing, pattern detection |
| **suggestedInsights** | Auto-generated actionable insights | Dashboard highlights |

---

## Smart Prep Time Estimation

**New Formula:**
```
estimated_minutes = average_prep_time + (quantity × 1.5) + (active_orders × 2)
```

Where:
- `average_prep_time` = Historical avg from last 20 completed orders
- `quantity` = Total items in current order
- `active_orders` = Count of orders currently being prepared

**Benefits:**
- Learns from actual kitchen performance
- Adapts as prep efficiency improves
- More accurate than random estimates

---

## Auto-Suggest Upsell Algorithm

When customer places an order:

1. Extract categories from ordered items
2. Find top 3 selling items from last 7 days
3. Filter out already-selected items
4. Return with name, category, price
5. Include in order response as `suggestedItems`

**Use Cases:**
- Show at checkout: "Customers who bought pizza also liked..."
- Mobile app: Display as "Recommended with your order"
- Cart upsell: Increase AOV by 5-15%

---

## Insights Auto-Generation

System auto-creates actionable suggestions based on thresholds:

```javascript
if (topItem && quantity > 0)
  → "Top item today: [name] ([qty] sold)"

if (repeatRate > 30%)
  → "Strong repeat customer rate: [rate]%"
else if (repeatRate < 20%)
  → "Low repeat customer rate: [rate]%. Focus on retention!"

if (weeklyGrowth > 0)
  → "Revenue growing: +[growth]% week-over-week"
else if (weeklyGrowth < 0)
  → "Revenue declining: [growth]% week-over-week"
```

---

## Example Dashboard Implementation

```javascript
// Fetch all insights
async function loadDashboard() {
  const response = await fetch('/api/restaurant/insights', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const { data } = await response.json();

  // Display top item widget
  document.getElementById('top-item').innerText = 
    data.topSellingToday?.itemName || 'No sales yet';
  
  // Display KPIs
  document.getElementById('repeat-rate').innerText = 
    data.repeatRate.toFixed(1) + '%';
  
  // Display growth indicator (green/red)
  const growthEl = document.getElementById('weekly-growth');
  growthEl.innerText = data.weeklyGrowth > 0 ? '+' : '';
  growthEl.innerText += data.weeklyGrowth.toFixed(1) + '%';
  growthEl.style.color = data.weeklyGrowth > 0 ? 'green' : 'red';
  
  // Display revenue chart using revenueTrend
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.revenueTrend.map(d => d._id),
      datasets: [{
        label: 'Daily Revenue',
        data: data.revenueTrend.map(d => d.total)
      }]
    }
  });

  // Display insights list
  const insightsList = document.getElementById('insights');
  insightsList.innerHTML = data.suggestedInsights
    .map(insight => `<li>${insight}</li>`)
    .join('');
}

// Listen for live top item updates
socket.on('restaurant:top-item-update', (topItem) => {
  document.getElementById('top-item').innerText = topItem.itemName;
  document.getElementById('top-item-count').innerText = topItem.totalSold;
});

// Initial load
loadDashboard();
```

---

## Performance Notes

- **Caching Opportunity**: Cache 30-day trends (updates hourly)
- **High Volume**: 1000+ daily orders → Consider Redis caching for /insights
- **Database Indexes**: Ensure indexes on `Order.status`, `Order.createdAt`, `Order.phone`
- **Aggregation**: Uses parallel Promise.all() for efficiency

---

## Testing the Features

```bash
# Get all insights
curl http://localhost:5000/api/restaurant/insights

# Verify socket emission after completing an order
curl -X PATCH http://localhost:5000/api/restaurant/orders/[ID]/status \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'
# → Should emit restaurant:top-item-update to admin room

# Check smart prep time
curl -X POST http://localhost:5000/api/restaurant/orders \
  -H "Content-Type: application/json" \
  -d '{...}' | jq .data.estimatedMinutes
# → Should use dynamic base time from recent orders
```

---

## Next Steps

1. **Frontend Dashboard**: Create insights UI with charts
2. **Email Alerts**: Send daily insights summary to admin
3. **Notifications**: Push notifications for low repeat rate or negative growth
4. **Caching**: Add Redis cache for expensive aggregations
5. **Alerts**: Alert when top item changes or sales spike
