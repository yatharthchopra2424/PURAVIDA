-- Categories

insert into public.product_categories (
  id,
  name,
  slug,
  label,
  description,
  image,
  subcategories,
  example_products,
  product_count
)
values
('herbal-extracts', 'Standardized Herbal Extracts', 'herbal-extracts', 'Premium Extracts', 'High-potency standardized extracts from premium botanicals, manufactured under strict GMP conditions to ensure consistent active compound levels.', '/images/Product%20Card%20Backgrounds.png', array['Root Extracts', 'Leaf Extracts', 'Bark Extracts', 'Fruit Extracts', 'Flower Extracts'], array['Curcumin 95%', 'Ashwagandha Root', 'Green Tea Extract'], 45),
('essential-oils', 'Essential Oils', 'essential-oils', 'Therapeutic Grade', 'Pure, therapeutic-grade essential oils sourced from the finest botanicals across India. Steam distilled and cold-pressed for maximum potency.', '/images/Product%20Card%20Backgrounds.png', array['Floral Oils', 'Herbal Oils', 'Spice Oils', 'Wood Oils', 'Citrus Oils'], array['Clove Leaf Oil', 'Eucalyptus Oil', 'Peppermint Oil'], 30),
('oleoresins', 'Oleoresins', 'oleoresins', 'High Potency', 'Concentrated oleoresins capturing the complete flavor and bioactive profile of spices and herbs through advanced solvent extraction.', '/images/Product%20Card%20Backgrounds.png', array['Spice Oleoresins', 'Herb Oleoresins', 'Capsicum Oleoresins'], array['Turmeric Oleoresin', 'Paprika Oleoresin', 'Black Pepper Oleoresin'], 18),
('fruit-juice-powders', 'Fruit Juice Powders', 'fruit-juice-powders', 'Natural Concentrates', 'Spray-dried fruit juice powders retaining the natural color, flavor, and nutritional profile of fresh fruits. Ideal for food & beverage applications.', '/images/Product%20Card%20Backgrounds.png', array['Tropical Fruit Powders', 'Berry Powders', 'Citrus Powders'], array['Amla Powder', 'Pomegranate Powder', 'Mango Powder'], 15),
('phytochemicals', 'Phytochemicals', 'phytochemicals', 'Research Grade', 'High-purity phytochemical isolates for pharmaceutical, nutraceutical, and research applications. HPLC-verified for potency and purity.', '/images/Product%20Card%20Backgrounds.png', array['Flavonoids', 'Alkaloids', 'Polyphenols', 'Terpenoids', 'Glycosides'], array['Curcuminoids', 'Piperine 95%', 'Quercetin'], 22),
('amino-acids', 'Amino Acids', 'amino-acids', 'Essential Nutrients', 'Pharmaceutical and food-grade amino acids manufactured to the highest purity standards. Available in both L-form and DL-form configurations.', '/images/Product%20Card%20Backgrounds.png', array['Essential Amino Acids', 'Non-Essential Amino Acids', 'Branched-Chain Amino Acids'], array['L-Glutamine', 'L-Arginine', 'L-Lysine'], 12),
('nutraceuticals', 'Nutraceuticals', 'nutraceuticals', 'Health & Wellness', 'Comprehensive range of nutraceutical ingredients for dietary supplements, functional foods, and wellness products. Backed by clinical research.', '/images/Product%20Card%20Backgrounds.png', array['Vitamins & Minerals', 'Probiotics', 'Omega Fatty Acids', 'Plant Proteins', 'Dietary Fibers'], array['Omega-3 Fish Oil', 'Collagen Peptides', 'Glucosamine'], 25)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  label = excluded.label,
  description = excluded.description,
  image = excluded.image,
  subcategories = excluded.subcategories,
  example_products = excluded.example_products,
  product_count = excluded.product_count;


-- Products

insert into public.products (
  id,
  name,
  slug,
  category_id,
  botanical_name,
  active_ingredient,
  active_compound,
  concentration,
  applications,
  description,
  image_path,
  quality_badges,
  is_halal,
  popularity
)
values
('he-001', 'Ashwagandha Extract', 'ashwagandha-extract', 'herbal-extracts', 'Withania somnifera', 'Withanolides', 'Withanolides', '5% - 10%', array['Immunity', 'Stress Relief', 'Energy', 'Adaptogen'], 'Premium ashwagandha root extract standardized to 5-10% withanolides. A powerful adaptogen used in Ayurvedic medicine for centuries to support stress response, immune function, and overall vitality.', 'ashwagandha-extract.jpg', array['ISO', 'GMP', 'FSSAI', 'Halal'], true, 98),
('he-002', 'Curcumin 95% Extract', 'curcumin-95-extract', 'herbal-extracts', 'Curcuma longa', 'Curcuminoids', 'Curcumin', '95%', array['Anti-inflammatory', 'Joint Health', 'Antioxidant', 'Skin Health'], 'Ultra-high purity curcumin extract standardized to 95% curcuminoids. Sourced from premium turmeric rhizomes and processed using advanced extraction technology.', null, array['ISO', 'GMP', 'FSSAI', 'Halal', 'FDA'], true, 99),
('he-003', 'Green Tea Extract', 'green-tea-extract', 'herbal-extracts', 'Camellia sinensis', 'EGCG', 'Epigallocatechin Gallate', '40% - 98%', array['Antioxidant', 'Weight Management', 'Cardiovascular', 'Cognitive'], 'Premium green tea extract with high EGCG content. Water-extracted from select Camellia sinensis leaves for maximum polyphenol retention.', 'green-tea-extract.jpg', array['ISO', 'GMP', 'FSSAI'], true, 92),
('he-004', 'Berberine HCL Extract', 'berberine-hcl-extract', 'herbal-extracts', 'Berberis aristata', 'Berberine', 'Berberine Hydrochloride', '97%', array['Blood Sugar', 'Cardiovascular', 'Digestive', 'Metabolism'], 'High-purity berberine hydrochloride extracted from Indian Barberry roots. Standardized to 97% for consistent therapeutic efficacy.', null, array['ISO', 'GMP', 'FSSAI', 'Halal'], true, 88),
('he-005', 'Aloe Vera Extract', 'aloe-vera-extract', 'herbal-extracts', 'Aloe barbadensis', 'Aloin', 'Acemannan', '10% - 40%', array['Skin Health', 'Digestive', 'Immunity', 'Wound Healing'], 'Concentrated aloe vera extract from freeze-dried inner leaf gel. Rich in acemannan polysaccharides for superior bio-activity.', null, array['ISO', 'GMP', 'FSSAI'], true, 85),
('he-006', 'Boswellia Extract', 'boswellia-extract', 'herbal-extracts', 'Boswellia serrata', 'Boswellic Acids', 'AKBA', '65%', array['Joint Health', 'Anti-inflammatory', 'Respiratory'], 'Standardized boswellia extract rich in boswellic acids including AKBA. Used extensively in joint health and anti-inflammatory formulations.', 'boswellia-extract.jpg', array['ISO', 'GMP', 'FSSAI', 'Halal'], true, 82),
('he-007', 'Bacopa Monnieri Extract', 'bacopa-monnieri-extract', 'herbal-extracts', 'Bacopa monnieri', 'Bacosides', 'Bacosides A & B', '20% - 50%', array['Cognitive', 'Memory', 'Stress Relief', 'Neuroprotection'], 'Brahmi extract standardized to high bacoside content. A revered nootropic in Ayurveda supporting memory, focus, and cognitive wellness.', null, array['ISO', 'GMP', 'FSSAI'], true, 80),
('he-008', 'Tribulus Terrestris Extract', 'tribulus-terrestris-extract', 'herbal-extracts', 'Tribulus terrestris', 'Saponins', 'Protodioscin', '40% - 90%', array['Sports Nutrition', 'Hormonal Balance', 'Vitality'], 'Potent tribulus extract standardized to saponins. Popular in sports nutrition and traditional vitality formulations.', null, array['ISO', 'GMP', 'FSSAI'], true, 76),
('he-009', 'Moringa Leaf Extract', 'moringa-leaf-extract', 'herbal-extracts', 'Moringa oleifera', 'Isothiocyanates', 'Moringin', '10%', array['Nutrition', 'Antioxidant', 'Immunity', 'Energy'], 'Nutrient-dense moringa leaf extract packed with vitamins, minerals, and antioxidants. Known as the ''miracle tree'' in traditional medicine.', null, array['ISO', 'GMP', 'FSSAI', 'Halal'], true, 78),
('he-010', 'Fenugreek Extract', 'fenugreek-extract', 'herbal-extracts', 'Trigonella foenum-graecum', 'Saponins', '4-Hydroxyisoleucine', '50%', array['Blood Sugar', 'Digestive', 'Lactation', 'Testosterone'], 'Standardized fenugreek seed extract rich in saponins and 4-hydroxyisoleucine. Versatile ingredient for metabolic and hormonal health.', 'fenugreek-extract.jpg', array['ISO', 'GMP', 'FSSAI'], true, 74),
('eo-001', 'Clove Leaf Oil', 'clove-leaf-oil', 'essential-oils', 'Syzygium aromaticum', 'Eugenol', 'Eugenol', '80% - 85%', array['Dental Care', 'Antimicrobial', 'Pain Relief', 'Aromatherapy'], 'Premium clove leaf essential oil with high eugenol content. Steam distilled from fresh Syzygium aromaticum leaves for maximum purity.', null, array['ISO', 'GMP', 'FSSAI'], true, 90),
('eo-002', 'Eucalyptus Oil', 'eucalyptus-oil', 'essential-oils', 'Eucalyptus globulus', 'Cineole', '1,8-Cineole', '70% - 80%', array['Respiratory', 'Antimicrobial', 'Pain Relief', 'Aromatherapy'], 'Therapeutic-grade eucalyptus essential oil rich in 1,8-cineole. Steam distilled from select eucalyptus plantations.', null, array['ISO', 'GMP', 'FSSAI'], true, 88),
('eo-003', 'Peppermint Oil', 'peppermint-oil', 'essential-oils', 'Mentha piperita', 'Menthol', 'Menthol', '40% - 50%', array['Digestive', 'Cooling', 'Respiratory', 'Aromatherapy'], 'Premium peppermint essential oil with high menthol content. Cold-pressed and steam distilled for the purest aroma profile.', null, array['ISO', 'GMP', 'FSSAI'], true, 86),
('eo-004', 'Tea Tree Oil', 'tea-tree-oil', 'essential-oils', 'Melaleuca alternifolia', 'Terpinen-4-ol', 'Terpinen-4-ol', '35% - 40%', array['Skin Care', 'Antimicrobial', 'Acne', 'Aromatherapy'], 'Pure tea tree essential oil standardized to terpinen-4-ol. Renowned for its powerful antimicrobial and skin-healing properties.', null, array['ISO', 'GMP'], true, 84),
('eo-005', 'Lavender Oil', 'lavender-oil', 'essential-oils', 'Lavandula angustifolia', 'Linalool', 'Linalool & Linalyl Acetate', '25% - 38%', array['Relaxation', 'Sleep', 'Skin Care', 'Aromatherapy'], 'Premium lavender essential oil steam distilled from hand-harvested Lavandula angustifolia flowers. Perfect balance of linalool and linalyl acetate.', null, array['ISO', 'GMP', 'FSSAI'], true, 91),
('or-001', 'Turmeric Oleoresin', 'turmeric-oleoresin', 'oleoresins', 'Curcuma longa', 'Curcuminoids', 'Curcumin', '15% - 25%', array['Food Coloring', 'Flavoring', 'Nutraceuticals', 'Cosmetics'], 'High-potency turmeric oleoresin capturing the complete curcuminoid and volatile oil profile. Ideal for natural coloring and flavoring.', 'turmeric-oleoresin-bottle.png', array['ISO', 'GMP', 'FSSAI', 'Halal'], true, 85),
('or-002', 'Paprika Oleoresin', 'paprika-oleoresin', 'oleoresins', 'Capsicum annuum', 'Capsanthin', 'Carotenoids', '60,000 - 100,000 CU', array['Food Coloring', 'Poultry Feed', 'Cosmetics'], 'Vibrant paprika oleoresin with exceptional color values. Solvent-extracted from premium Capsicum annuum fruits.', null, array['ISO', 'GMP', 'FSSAI'], true, 80),
('or-003', 'Black Pepper Oleoresin', 'black-pepper-oleoresin', 'oleoresins', 'Piper nigrum', 'Piperine', 'Piperine', '40% - 55%', array['Food Flavoring', 'Bioavailability Enhancer', 'Nutraceuticals'], 'Concentrated black pepper oleoresin rich in piperine. Enhances bioavailability of curcumin and other nutrients by up to 2000%.', 'black-pepper-oleoresin-bottle.png', array['ISO', 'GMP', 'FSSAI', 'Halal'], true, 83),
('fp-001', 'Amla Powder', 'amla-powder', 'fruit-juice-powders', 'Phyllanthus emblica', 'Vitamin C', 'Ascorbic Acid', '20% - 40%', array['Immunity', 'Skin Health', 'Hair Care', 'Antioxidant'], 'Spray-dried amla (Indian gooseberry) powder preserving natural vitamin C content. One of the richest natural sources of ascorbic acid.', null, array['ISO', 'GMP', 'FSSAI', 'Halal'], true, 87),
('fp-002', 'Pomegranate Powder', 'pomegranate-powder', 'fruit-juice-powders', 'Punica granatum', 'Ellagic Acid', 'Punicalagins', '40%', array['Cardiovascular', 'Antioxidant', 'Skin Health', 'Beverages'], 'Premium pomegranate juice powder rich in punicalagins and ellagic acid. Retains the vibrant color and antioxidant potency of fresh fruit.', null, array['ISO', 'GMP', 'FSSAI'], true, 82),
('fp-003', 'Mango Powder', 'mango-powder', 'fruit-juice-powders', 'Mangifera indica', 'Beta-Carotene', 'Mangiferin', 'Natural', array['Beverages', 'Food Flavoring', 'Nutrition', 'Cosmetics'], 'Spray-dried mango fruit powder capturing the authentic tropical flavor and nutritional benefits of Alphonso mangoes.', null, array['ISO', 'GMP', 'FSSAI'], true, 79),
('pc-001', 'Piperine 95%', 'piperine-95', 'phytochemicals', 'Piper nigrum', 'Piperine', 'Piperine', '95% - 98%', array['Bioavailability', 'Nutraceuticals', 'Pharmaceutical', 'Research'], 'Ultra-pure piperine isolate verified by HPLC. The gold standard bioavailability enhancer for curcumin and nutrient absorption formulations.', null, array['ISO', 'GMP', 'FSSAI'], true, 86),
('pc-002', 'Quercetin Extract', 'quercetin-extract', 'phytochemicals', 'Sophora japonica', 'Quercetin', 'Quercetin Dihydrate', '95% - 98%', array['Antioxidant', 'Immunity', 'Anti-allergic', 'Research'], 'High-purity quercetin extracted from Sophora japonica flower buds. Powerful flavonoid antioxidant for immune and cardiovascular support.', null, array['ISO', 'GMP'], true, 81),
('pc-003', 'Resveratrol Extract', 'resveratrol-extract', 'phytochemicals', 'Polygonum cuspidatum', 'Resveratrol', 'Trans-Resveratrol', '50% - 98%', array['Anti-aging', 'Cardiovascular', 'Antioxidant', 'Research'], 'Premium trans-resveratrol extracted from Japanese Knotweed. Renowned polyphenol supporting cardiovascular and longevity research.', null, array['ISO', 'GMP', 'FSSAI'], true, 84),
('aa-001', 'L-Glutamine', 'l-glutamine', 'amino-acids', null, 'L-Glutamine', 'L-Glutamine', '99%', array['Sports Nutrition', 'Gut Health', 'Immunity', 'Recovery'], 'Pharmaceutical-grade L-Glutamine with 99% purity. The most abundant amino acid in the body, essential for muscle recovery and gut health.', null, array['ISO', 'GMP', 'FSSAI'], true, 78),
('aa-002', 'L-Arginine', 'l-arginine', 'amino-acids', null, 'L-Arginine', 'L-Arginine HCL', '99%', array['Cardiovascular', 'Sports Nutrition', 'Blood Flow', 'Immunity'], 'High-purity L-Arginine supporting nitric oxide production for cardiovascular health and athletic performance.', 'l-arginine-powder-white.png', array['ISO', 'GMP'], true, 75),
('aa-003', 'L-Lysine HCL', 'l-lysine-hcl', 'amino-acids', null, 'L-Lysine', 'L-Lysine Hydrochloride', '99%', array['Immunity', 'Collagen Synthesis', 'Cold Sores', 'Growth'], 'Essential amino acid L-Lysine in hydrochloride form. Critical for collagen production, calcium absorption, and immune function.', null, array['ISO', 'GMP', 'FSSAI'], true, 72),
('nu-001', 'Omega-3 Fish Oil', 'omega-3-fish-oil', 'nutraceuticals', null, 'EPA & DHA', 'Omega-3 Fatty Acids', '30% - 60%', array['Cardiovascular', 'Brain Health', 'Joint Health', 'Eye Health'], 'Molecularly distilled omega-3 fish oil concentrate. Rich in EPA and DHA for comprehensive cardiovascular and cognitive support.', null, array['ISO', 'GMP', 'FSSAI'], false, 89),
('nu-002', 'Collagen Peptides', 'collagen-peptides', 'nutraceuticals', null, 'Hydrolyzed Collagen', 'Type I & III Collagen', '90%+', array['Skin Health', 'Joint Health', 'Hair & Nails', 'Anti-aging'], 'Bioavailable hydrolyzed collagen peptides from grass-fed sources. Low molecular weight for superior absorption and bioavailability.', null, array['ISO', 'GMP', 'FSSAI', 'Halal'], true, 86),
('nu-003', 'Glucosamine Sulfate', 'glucosamine-sulfate', 'nutraceuticals', null, 'Glucosamine', 'Glucosamine Sulfate 2KCL', '99%', array['Joint Health', 'Cartilage', 'Mobility', 'Sports Nutrition'], 'Pharmaceutical-grade glucosamine sulfate for joint health and cartilage support. Clinically studied for osteoarthritis management.', null, array['ISO', 'GMP', 'FSSAI'], true, 77),
('nu-004', 'CoQ10 (Coenzyme Q10)', 'coq10', 'nutraceuticals', null, 'Ubiquinone', 'Coenzyme Q10', '98%', array['Heart Health', 'Energy', 'Anti-aging', 'Cellular Health'], 'Highly bioavailable Coenzyme Q10 in ubiquinone form. Essential for cellular energy production and powerful antioxidant protection.', null, array['ISO', 'GMP'], true, 83)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  category_id = excluded.category_id,
  botanical_name = excluded.botanical_name,
  active_ingredient = excluded.active_ingredient,
  active_compound = excluded.active_compound,
  concentration = excluded.concentration,
  applications = excluded.applications,
  description = excluded.description,
  image_path = excluded.image_path,
  quality_badges = excluded.quality_badges,
  is_halal = excluded.is_halal,
  popularity = excluded.popularity;
