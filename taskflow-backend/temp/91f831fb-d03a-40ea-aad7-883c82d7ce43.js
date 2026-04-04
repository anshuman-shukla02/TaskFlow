function maxProfit(prices) {
 class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        if not prices:
            return 0
        
        min_price = float('inf')
        max_profit = 0
        
        for price in prices:
            if price < min_price:
                min_price = price
            elif price - min_price > max_profit:
                max_profit = price - min_price
                
        return max_profit


}

// --- SYSTEM DRIVER CODE ---
console.log("Test Case 1:", maxProfit([7,1,5,3,6,4]));
console.log("Test Case 2:", maxProfit([7,6,4,3,1]));