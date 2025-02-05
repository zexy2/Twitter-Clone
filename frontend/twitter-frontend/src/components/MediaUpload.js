function MediaUpload() {
  const handleMediaUpload = async (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('media', file));
    
    // Upload işlemi
  };
  
  return (
    <div className="media-upload">
      <input type="file" multiple accept="image/*,video/*" />
      <div className="media-preview">
        {/* Yüklenen medya önizlemesi */}
      </div>
    </div>
  );
} 