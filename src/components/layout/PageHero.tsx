import { motion } from "framer-motion";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  images?: string[];
  height?: string;
}

export default function PageHero({ title, subtitle, images = [], height = "60vh" }: PageHeroProps) {
  const bgImage = images.length > 0 ? images[0] : "https://picsum.photos/seed/gaming/1920/1080?blur=4";

  return (
    <div 
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{ height }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={bgImage} 
          alt={title} 
          className="w-full h-full object-cover opacity-40 grayscale hover:grayscale-0 transition-all duration-1000"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center px-4"
      >
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 uppercase italic">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl md:text-2xl font-bold text-[#A855F7] tracking-widest uppercase">
            {subtitle}
          </p>
        )}
      </motion.div>
    </div>
  );
}
