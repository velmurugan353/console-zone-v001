import React, { useState, useEffect } from 'react';
import { useCustomizer } from '../context/CustomizerContext';
import { Edit2, Check, X, Image as ImageIcon } from 'lucide-react';

interface EditableTextProps {
  pageKey: string;
  itemKey: string;
  defaultText: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

export const EditableText: React.FC<EditableTextProps> = ({
  pageKey,
  itemKey,
  defaultText,
  className = '',
  as: Component = 'span'
}) => {
  const { content, isEditMode, updateContent } = useCustomizer();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content[pageKey]?.[itemKey] || defaultText);

  useEffect(() => {
    setValue(content[pageKey]?.[itemKey] || defaultText);
  }, [content, pageKey, itemKey, defaultText]);

  const handleSave = () => {
    updateContent(pageKey, itemKey, value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(content[pageKey]?.[itemKey] || defaultText);
    setIsEditing(false);
  };

  if (!isEditMode) {
    return <Component className={className}>{content[pageKey]?.[itemKey] || defaultText}</Component>;
  }

  if (isEditing) {
    return (
      <div className={`relative inline-block w-full group ${className}`}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-black/50 border border-[#A855F7] rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-[#A855F7]"
          rows={value.split('\n').length}
          autoFocus
        />
        <div className="absolute top-full right-0 mt-1 flex space-x-1 z-50">
          <button onClick={handleSave} className="p-1 bg-green-500 text-white rounded shadow-lg hover:bg-green-600">
            <Check size={12} />
          </button>
          <button onClick={handleCancel} className="p-1 bg-red-500 text-white rounded shadow-lg hover:bg-red-600">
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group cursor-pointer border border-transparent hover:border-[#A855F7]/50 rounded px-1 -mx-1 transition-all ${className}`} onClick={() => setIsEditing(true)}>
      <Component>{content[pageKey]?.[itemKey] || defaultText}</Component>
      <div className="absolute -top-3 -right-3 hidden group-hover:flex p-1 bg-[#A855F7] text-white rounded-full shadow-lg">
        <Edit2 size={10} />
      </div>
    </div>
  );
};

interface EditableImageProps {
  pageKey: string;
  itemKey: string;
  defaultSrc: string;
  alt: string;
  className?: string;
}

export const EditableImage: React.FC<EditableImageProps> = ({
  pageKey,
  itemKey,
  defaultSrc,
  alt,
  className = ''
}) => {
  const { content, isEditMode, updateContent } = useCustomizer();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content[pageKey]?.[itemKey] || defaultSrc);

  useEffect(() => {
    setValue(content[pageKey]?.[itemKey] || defaultSrc);
  }, [content, pageKey, itemKey, defaultSrc]);

  const handleSave = () => {
    updateContent(pageKey, itemKey, value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(content[pageKey]?.[itemKey] || defaultSrc);
    setIsEditing(false);
  };

  if (!isEditMode) {
    return <img src={content[pageKey]?.[itemKey] || defaultSrc} alt={alt} className={className} />;
  }

  if (isEditing) {
    return (
      <div className={`relative ${className} border-2 border-[#A855F7] rounded-lg p-2 bg-black/80 flex flex-col items-center justify-center space-y-4 z-40`}>
        <div className="w-full">
          <label className="block text-[10px] uppercase font-bold text-[#A855F7] mb-1">Image URL</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none"
            placeholder="https://..."
            autoFocus
          />
        </div>
        <div className="flex space-x-2">
          <button onClick={handleSave} className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded hover:bg-green-600 flex items-center space-x-1">
            <Check size={10} /> <span>Save</span>
          </button>
          <button onClick={handleCancel} className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-600 flex items-center space-x-1">
            <X size={10} /> <span>Cancel</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group cursor-pointer overflow-hidden ${className}`} onClick={() => setIsEditing(true)}>
      <img src={content[pageKey]?.[itemKey] || defaultSrc} alt={alt} className="w-full h-full object-cover transition-all group-hover:scale-105 group-hover:opacity-80" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
        <div className="p-3 bg-[#A855F7] text-white rounded-full shadow-2xl">
          <ImageIcon size={24} />
        </div>
      </div>
      <div className="absolute top-2 right-2 p-1 bg-[#A855F7] text-white rounded-full shadow-lg">
        <Edit2 size={12} />
      </div>
    </div>
  );
};
