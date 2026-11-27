INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'focust-plant-images',
  'focust-plant-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS focust_plant_images_storage_read ON storage.objects;
CREATE POLICY focust_plant_images_storage_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'focust-plant-images');
