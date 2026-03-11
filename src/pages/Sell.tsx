import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, DollarSign, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

const sellSchema = z.object({
  productName: z.string().min(3, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  condition: z.string().min(1, "Condition is required"),
  description: z.string().min(10, "Please describe the item"),
  expectedPrice: z.number().min(1, "Price must be greater than 0"),
});

type SellFormValues = z.infer<typeof sellSchema>;

export default function Sell() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<SellFormValues>({
    resolver: zodResolver(sellSchema)
  });

  const onSubmit = (data: SellFormValues) => {
    console.log(data);
    setTimeout(() => setSubmitted(true), 1000);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gaming-card border border-gaming-accent/50 p-12 rounded-2xl"
        >
          <div className="w-20 h-20 bg-gaming-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-gaming-accent" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Listing Submitted!</h2>
          <p className="text-gaming-muted mb-8">
            Our team will review your listing and price suggestion.
            Once approved, it will be live on the marketplace.
          </p>
          <a href="/dashboard" className="text-gaming-accent hover:underline">Go to Dashboard</a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Sell Your Gear</h1>
        <p className="text-gaming-muted">
          Turn your old consoles and games into cash. Fill out the form below to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-gaming-card border border-gaming-border rounded-xl p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gaming-muted">Product Name</label>
          <input
            type="text"
            {...register('productName')}
            placeholder="e.g. PlayStation 4 Pro 1TB"
            className="w-full bg-gaming-bg border border-gaming-border rounded-lg p-3 text-white focus:border-gaming-accent focus:outline-none"
          />
          {errors.productName && <p className="text-red-500 text-xs">{errors.productName.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gaming-muted">Category</label>
            <select
              {...register('category')}
              className="w-full bg-gaming-bg border border-gaming-border rounded-lg p-3 text-white focus:border-gaming-accent focus:outline-none"
            >
              <option value="">Select Category</option>
              <option value="console">Console</option>
              <option value="controller">Controller</option>
              <option value="game">Game</option>
              <option value="accessory">Accessory</option>
            </select>
            {errors.category && <p className="text-red-500 text-xs">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gaming-muted">Condition</label>
            <select
              {...register('condition')}
              className="w-full bg-gaming-bg border border-gaming-border rounded-lg p-3 text-white focus:border-gaming-accent focus:outline-none"
            >
              <option value="">Select Condition</option>
              <option value="new">Like New (Box Open)</option>
              <option value="good">Good (Minor Scratches)</option>
              <option value="fair">Fair (Visible Wear)</option>
              <option value="broken">Broken / For Parts</option>
            </select>
            {errors.condition && <p className="text-red-500 text-xs">{errors.condition.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gaming-muted">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Describe any defects, included accessories, or history..."
            className="w-full bg-gaming-bg border border-gaming-border rounded-lg p-3 text-white focus:border-gaming-accent focus:outline-none"
          ></textarea>
          {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gaming-muted">Expected Price (₹)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gaming-muted" />
            <input
              type="number"
              {...register('expectedPrice', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full bg-gaming-bg border border-gaming-border rounded-lg pl-10 pr-4 py-3 text-white focus:border-gaming-accent focus:outline-none"
            />
          </div>
          {errors.expectedPrice && <p className="text-red-500 text-xs">{errors.expectedPrice.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gaming-muted">Upload Images</label>
          <div className="border-2 border-dashed border-gaming-border rounded-lg p-8 text-center hover:border-gaming-accent transition-colors cursor-pointer bg-gaming-bg/50">
            <Upload className="h-8 w-8 text-gaming-muted mx-auto mb-2" />
            <p className="text-sm text-gaming-muted">Click to upload or drag and drop</p>
            <p className="text-xs text-gaming-muted/50 mt-1">JPG, PNG up to 5MB</p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-gaming-accent text-black font-bold rounded-xl hover:bg-gaming-accent/90 transition-colors"
        >
          Submit Listing
        </button>
      </form>
    </div>
  );
}
