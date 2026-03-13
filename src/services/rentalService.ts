import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { isWithinInterval, areIntervalsOverlapping, parseISO } from 'date-fns';

export interface RentalUnit {
    id: string;
    serialNumber: string;
    status: 'available' | 'rented' | 'maintenance' | 'damaged';
    health: number;
    usageCount: number;
}

export const rentalService = {
    /**
     * Finds available units for a specific console model and date range
     */
    checkAvailability: async (consoleId: string, startDate: Date, endDate: Date) => {
        try {
            // 1. Get all units of this model
            const inventoryRef = collection(db, 'inventory');
            const q = query(inventoryRef, where('productId', '==', consoleId), where('status', '!=', 'damaged'));
            const inventorySnap = await getDocs(q);
            
            const allUnits = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
            
            if (allUnits.length === 0) return { available: false, units: [] };

            // 2. Get all active/pending rentals for this model to check for overlaps
            const rentalsRef = collection(db, 'rentals');
            const rq = query(rentalsRef, where('productId', '==', consoleId), where('status', 'in', ['active', 'pending']));
            const rentalsSnap = await getDocs(rq);
            
            const existingRentals = rentalsSnap.docs.map(doc => doc.data());

            // 3. Filter out units that have an overlapping rental
            const availableUnits = allUnits.filter(unit => {
                const unitRentals = existingRentals.filter(r => r.unitId === unit.id);
                
                const hasOverlap = unitRentals.some(rental => {
                    const rStart = new Date(rental.startDate);
                    const rEnd = new Date(rental.endDate);
                    return areIntervalsOverlapping(
                        { start: startDate, end: endDate },
                        { start: rStart, end: rEnd }
                    );
                });

                return !hasOverlap && unit.status === 'Available'; // Firestore usually stores capitalized from our seed
            });

            return {
                available: availableUnits.length > 0,
                units: availableUnits,
                count: availableUnits.length
            };
        } catch (error) {
            console.error("Availability check failed:", error);
            return { available: false, units: [], error };
        }
    },

    /**
     * Processes a return with condition assessment
     */
    processReturn: async (rentalId: string, unitId: string, condition: 'good' | 'minor' | 'major', repairCost: number = 0) => {
        try {
            const rentalRef = doc(db, 'rentals', rentalId);
            const unitRef = doc(db, 'inventory', unitId);

            // 1. Calculate refund
            const rentalSnap = await getDoc(rentalRef);
            const rentalData = rentalSnap.data();
            if (!rentalData) throw new Error("Rental not found");

            const finalRefund = Math.max(0, rentalData.deposit - repairCost);

            // 2. Update Rental Status
            await updateDoc(rentalRef, {
                status: 'completed',
                returnCondition: condition,
                repairCost: repairCost,
                finalRefund: finalRefund,
                returnedAt: serverTimestamp()
            });

            // 3. Update Inventory Unit
            const unitSnap = await getDoc(unitRef);
            const currentUsage = unitSnap.data()?.usageCount || 0;
            const currentHealth = unitSnap.data()?.health || 100;

            let newStatus: any = 'available';
            let healthPenalty = 0;

            if (condition === 'minor') healthPenalty = 5;
            if (condition === 'major') {
                healthPenalty = 20;
                newStatus = 'maintenance';
            }

            await updateDoc(unitRef, {
                status: newStatus,
                usageCount: currentUsage + 1,
                health: Math.max(0, currentHealth - healthPenalty),
                lastService: new Date().toISOString()
            });

            return { success: true, refund: finalRefund };
        } catch (error) {
            console.error("Return processing failed:", error);
            throw error;
        }
    },

    /**
     * Automatically calculates late fees
     */
    calculateLateFees: (endDate: string, hourlyRate: number = 100) => {
        const end = new Date(endDate);
        const now = new Date();
        
        if (now <= end) return 0;

        const diffInMs = now.getTime() - end.getTime();
        const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60));
        
        return diffInHours * hourlyRate;
    }
};
