-- Make svg_clothes_files bucket public (read via public URL).
update storage.buckets
set public = true
where id = 'svg_clothes_files';

-- Allow anyone to read clothing SVG assets (catalog is not user-specific).
drop policy if exists "Public read svg_clothes_files" on storage.objects;
create policy "Public read svg_clothes_files"
  on storage.objects
  for select
  to public
  using (bucket_id = 'svg_clothes_files');

-- Migrate legacy PascalCase wardrobe svg keys to stable catalog ids.
update user_weather_wardrobes set top_svg = case top_svg
  when 'TShirt' then 'tops-neutral-tshirt'
  when 'LongSleeve' then 'tops-neutral-shirt'
  when 'Sweater' then 'outerwear-neutral-sweater'
  when 'Dress' then 'tops-feminine-dress'
  when 'Jacket' then 'outerwear-neutral-jacket'
  when 'HeavyJacket' then 'outerwear-neutral-jacket-1'
  when 'HeavyCoat' then 'outerwear-neutral-coat'
  when 'RainJacket' then 'outerwear-neutral-raincoat'
  when 'WomensJacket' then 'outerwear-neutral-jacket-3'
  else top_svg end
where top_svg in ('TShirt','LongSleeve','Sweater','Dress','Jacket','HeavyJacket','HeavyCoat','RainJacket','WomensJacket');

update user_weather_wardrobes set bottom_svg = case bottom_svg
  when 'Pants' then 'bottoms-neutral-trousers'
  when 'Shorts' then 'bottoms-neutral-shorts'
  when 'WomensJeans' then 'bottoms-neutral-jeans'
  else bottom_svg end
where bottom_svg in ('Pants','Shorts','WomensJeans');

update user_weather_wardrobes set outerwear_svg = case outerwear_svg
  when 'Jacket' then 'outerwear-neutral-jacket'
  when 'HeavyJacket' then 'outerwear-neutral-jacket-1'
  when 'HeavyCoat' then 'outerwear-neutral-coat'
  when 'RainJacket' then 'outerwear-neutral-raincoat'
  when 'WomensJacket' then 'outerwear-neutral-jacket-3'
  else outerwear_svg end
where outerwear_svg in ('Jacket','HeavyJacket','HeavyCoat','RainJacket','WomensJacket');

update user_weather_wardrobes set footwear_svg = case footwear_svg
  when 'Sneakers' then 'footwear-neutral-sneakers'
  when 'FlipFlops' then 'footwear-neutral-flip-flops'
  when 'SnowBoots' then 'footwear-masculine-boots'
  when 'RainBoots' then 'footwear-masculine-boot'
  else footwear_svg end
where footwear_svg in ('Sneakers','FlipFlops','SnowBoots','RainBoots');

update user_weather_wardrobes set accessory_svgs = (
  select coalesce(array_agg(
    case v
      when 'Umbrella' then 'accessories-neutral-umbrella'
      when 'Sunglasses' then 'accessories-neutral-sunglasses'
      when 'Scarf' then 'accessories-neutral-scarf'
      when 'Beanie' then 'accessories-neutral-beanie'
      when 'Gloves' then 'accessories-neutral-gloves'
      else v
    end
  ), '{}')
  from unnest(accessory_svgs) as v
)
where accessory_svgs && array['Umbrella','Sunglasses','Scarf','Beanie','Gloves']::text[];
