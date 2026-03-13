/// <reference types="vite/client" />
declare const Razorpay: any;

export interface RazorpayOptions {
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id?: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    handler: (response: any) => void;
    modal?: {
        ondismiss?: () => void;
    };
    theme?: {
        color?: string;
    };
}

class RazorpayService {
    private keyId: string = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

    constructor() { }

    async openCheckout(options: Partial<RazorpayOptions>) {
        if (typeof Razorpay === 'undefined') {
            console.error('Razorpay SDK not loaded');
            return;
        }

        const fullOptions = {
            key: this.keyId,
            amount: options.amount || 0,
            currency: options.currency || 'INR',
            name: options.name || 'ConsoleZone',
            description: options.description || 'ConsoleZone Purchase',
            prefill: options.prefill || {},
            handler: options.handler || ((res: any) => console.log('Payment Success:', res)),
            modal: options.modal || {},
            theme: {
                color: '#B000FF',
                ...options.theme
            }
        };

        const rzp = new Razorpay(fullOptions);
        rzp.open();
    }
}

export const razorpayService = new RazorpayService();

