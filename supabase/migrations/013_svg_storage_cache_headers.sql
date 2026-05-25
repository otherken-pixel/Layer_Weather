-- Long-lived CDN/browser cache for immutable clothing SVG filenames.
update storage.objects
set metadata = coalesce(metadata, '{}'::jsonb) || '{"cacheControl": "public, max-age=31536000, immutable"}'::jsonb
where bucket_id = 'svg_clothes_files';
