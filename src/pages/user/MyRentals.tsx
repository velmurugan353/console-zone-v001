import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { differenceInDays, parseISO } from 'date-fns';

export default function MyRentals() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rentals'),
      where('email', '==', user.email),
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRentals = snapshot.docs.map(doc => {
        const data = doc.data();
        const daysLeft = data.endDate ? differenceInDays(parseISO(data.endDate), new Date()) : 0;
        return {
          id: doc.id,
          ...data,
          daysLeft: Math.max(0, daysLeft)
        };
      });
      setRentals(fetchedRentals);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching rentals:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gaming-accent"></div>
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="bg-gaming-card border border-gaming-border rounded-xl p-12 text-center">
        <Calendar className="h-12 w-12 text-gaming-muted mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No rentals found</h3>
        <p className="text-gaming-muted">You haven't rented any equipment yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Rentals</h1>

      <div className="grid grid-cols-1 gap-6">
        {rentals.map((rental) => (
          <div key={rental.id} className="bg-gaming-card border border-gaming-border rounded-xl p-6 flex flex-col md:flex-row gap-6">
            <img src={rental.image} alt={rental.product} className="w-full md:w-48 h-48 object-cover rounded-xl bg-gaming-bg" />

            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">{rental.product}</h3>
                  <p className="text-gaming-muted text-sm font-mono mt-1">ID: {rental.id}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${rental.status === 'active' ? 'bg-blue-400/10 text-blue-400' :
                    rental.status === 'pending' ? 'bg-amber-400/10 text-amber-400' :
                      'bg-green-400/10 text-green-400'
                  }`}>
                  {rental.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gaming-bg p-3 rounded-lg">
                  <span className="text-gaming-muted text-xs block mb-1">Rental Period</span>
                  <div className="flex items-center text-white text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gaming-accent" />
                    {rental.startDate} - {rental.endDate}
                  </div>
                </div>
                <div className="bg-gaming-bg p-3 rounded-lg">
                  <span className="text-gaming-muted text-xs block mb-1">Total Cost</span>
                  <div className="text-white font-bold text-sm">
                    {formatCurrency(rental.totalPrice || rental.price)}
                  </div>
                </div>
              </div>

              {rental.status === 'active' && (
                <div className="flex items-center p-3 bg-yellow-400/10 text-yellow-400 rounded-lg text-sm">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{rental.daysLeft} day(s) remaining until return due date.</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {rental.status === 'active' ? (
                  <>
                    <button className="flex-1 bg-gaming-accent text-black font-bold py-2 rounded-lg hover:bg-gaming-accent/90 transition-colors">
                      Extend Rental
                    </button>
                    <button className="flex-1 bg-gaming-bg border border-gaming-border text-white font-bold py-2 rounded-lg hover:bg-gaming-border transition-colors">
                      Return Instructions
                    </button>
                  </>
                ) : (
                  <button className="bg-gaming-bg border border-gaming-border text-white font-bold py-2 px-6 rounded-lg hover:bg-gaming-border transition-colors">
                    Rent Again
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
