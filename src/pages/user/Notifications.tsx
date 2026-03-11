import { Bell, ShoppingBag, Gamepad2, Info } from 'lucide-react';

export default function Notifications() {
  const notifications = [
    {
      id: 1,
      type: 'order',
      title: 'Order Shipped',
      message: 'Your order #ORD-12345 has been shipped and is on its way!',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'rental',
      title: 'Rental Due Soon',
      message: 'Your rental for PlayStation 5 Pro is due in 1 day.',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'system',
      title: 'Welcome to ConsoleZone',
      message: 'Thanks for creating an account! Explore our latest collection.',
      time: '2 days ago',
      read: true
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <button className="text-sm text-gaming-accent hover:underline">Mark all as read</button>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-gaming-card border rounded-xl p-4 flex gap-4 transition-colors ${notification.read ? 'border-gaming-border opacity-70' : 'border-gaming-accent/50 bg-gaming-accent/5'
              }`}
          >
            <div className={`p-3 rounded-full h-fit ${notification.type === 'order' ? 'bg-green-400/10 text-green-400' :
                notification.type === 'rental' ? 'bg-blue-400/10 text-blue-400' :
                  'bg-gray-400/10 text-gray-400'
              }`}>
              {notification.type === 'order' && <ShoppingBag className="h-5 w-5" />}
              {notification.type === 'rental' && <Gamepad2 className="h-5 w-5" />}
              {notification.type === 'system' && <Info className="h-5 w-5" />}
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className={`font-bold ${notification.read ? 'text-gaming-muted' : 'text-white'}`}>
                  {notification.title}
                </h3>
                <span className="text-xs text-gaming-muted">{notification.time}</span>
              </div>
              <p className="text-gaming-muted text-sm mt-1">{notification.message}</p>
            </div>

            {!notification.read && (
              <div className="w-2 h-2 bg-gaming-accent rounded-full mt-2"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
