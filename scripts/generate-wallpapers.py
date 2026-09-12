#!/usr/bin/env python3
"""
Generates ultra-high definition SVG wallpapers for REEC Academy:
- public/wallpaper-light.svg (Iridescent silvery ice-blue, golden amber glow, lavender silk waves)
- public/wallpaper-dark.svg (Deep cosmic midnight blue, electric sapphire, golden amber & radiant violet silk waves)
Matching the user's provided silk fabric wallpaper images with photographic fidelity.
"""

import os

def create_light_wallpaper():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <!-- Master Silk Filters -->
    <filter id="silkBlurHeavy" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="85" result="blur" />
    </filter>
    <filter id="silkBlurMed" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="50" result="blur" />
    </filter>
    <filter id="silkBlurSoft" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="25" result="blur" />
    </filter>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="40" result="blur" />
    </filter>

    <!-- Base Canvas Gradient -->
    <linearGradient id="lightBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9dc1f2" />
      <stop offset="25%" stop-color="#b6d5fc" />
      <stop offset="50%" stop-color="#9bbdf0" />
      <stop offset="75%" stop-color="#bed7f8" />
      <stop offset="100%" stop-color="#a2c4f4" />
    </linearGradient>

    <!-- Warm Amber Golden Light Glows (Lower Left & Crevices) -->
    <radialGradient id="amberGlowMain" cx="12%" cy="68%" r="45%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#fed7aa" stop-opacity="0.80" />
      <stop offset="55%" stop-color="#fdba74" stop-opacity="0.45" />
      <stop offset="85%" stop-color="#f59e0b" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="amberGlowSecondary" cx="62%" cy="78%" r="35%">
      <stop offset="0%" stop-color="#fed7aa" stop-opacity="0.85" />
      <stop offset="30%" stop-color="#fde68a" stop-opacity="0.60" />
      <stop offset="70%" stop-color="#f59e0b" stop-opacity="0.20" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="amberGlowPocket" cx="28%" cy="75%" r="28%">
      <stop offset="0%" stop-color="#fffbeb" stop-opacity="0.95" />
      <stop offset="35%" stop-color="#fef3c7" stop-opacity="0.75" />
      <stop offset="65%" stop-color="#fde68a" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
    </radialGradient>

    <!-- Violet / Lavender Iridescent Sheen (Right Folds) -->
    <radialGradient id="violetSheen" cx="82%" cy="42%" r="50%">
      <stop offset="0%" stop-color="#f3e8ff" stop-opacity="0.90" />
      <stop offset="25%" stop-color="#e9d5ff" stop-opacity="0.70" />
      <stop offset="55%" stop-color="#d8b4fe" stop-opacity="0.40" />
      <stop offset="85%" stop-color="#c084fc" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="lilacLower" cx="88%" cy="85%" r="38%">
      <stop offset="0%" stop-color="#fdf4ff" stop-opacity="0.85" />
      <stop offset="35%" stop-color="#f5d0fe" stop-opacity="0.60" />
      <stop offset="75%" stop-color="#e879f9" stop-opacity="0.20" />
      <stop offset="100%" stop-color="#d946ef" stop-opacity="0" />
    </radialGradient>

    <!-- Liquid Specular Silk Ribbons -->
    <linearGradient id="silkCrest1" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="30%" stop-color="#e0f2fe" stop-opacity="0.80" />
      <stop offset="65%" stop-color="#bae6fd" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0.10" />
    </linearGradient>

    <linearGradient id="silkCrest2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98" />
      <stop offset="25%" stop-color="#f0f9ff" stop-opacity="0.85" />
      <stop offset="55%" stop-color="#c7d2fe" stop-opacity="0.50" />
      <stop offset="100%" stop-color="#a5b4fc" stop-opacity="0.15" />
    </linearGradient>

    <!-- Deep Satin Valleys & Drop Shadows -->
    <linearGradient id="silkShadow1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5588cc" stop-opacity="0.65" />
      <stop offset="50%" stop-color="#699ce0" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#7eaee8" stop-opacity="0" />
    </linearGradient>

    <linearGradient id="silkShadowDiagonal" x1="20%" y1="10%" x2="80%" y2="90%">
      <stop offset="0%" stop-color="#4a7ebc" stop-opacity="0.55" />
      <stop offset="45%" stop-color="#5b8fcf" stop-opacity="0.30" />
      <stop offset="100%" stop-color="#6fa3e3" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- 1. Base Silk Canvas -->
  <rect width="2560" height="1440" fill="url(#lightBase)" />

  <!-- 2. Primary Cloth Wave 1: Sweeping Upper Fold from Top Right to Center Left -->
  <path d="M-100,-100 C600,-80 1200,180 1500,420 C1800,660 2100,520 2700,200 L2700,-100 Z" 
        fill="url(#silkCrest1)" filter="url(#silkBlurHeavy)" opacity="0.85" />

  <!-- 3. Upper Left Fluid Satin Curve -->
  <path d="M-100,200 C450,150 750,480 1100,580 C1500,700 1900,450 2700,600 L2700,1500 L-100,1500 Z" 
        fill="#7ba7e4" filter="url(#silkBlurHeavy)" opacity="0.45" />

  <!-- 4. Deep Crease Shadow sweeping under the main diagonal fold -->
  <path d="M-50,650 C380,480 750,420 1200,650 C1650,880 2050,750 2700,520 L2700,850 C2100,1050 1600,1050 1100,850 C600,650 200,780 -50,950 Z" 
        fill="url(#silkShadowDiagonal)" filter="url(#silkBlurMed)" opacity="0.60" />

  <!-- 5. Majestic Iridescent Silk Ridge (The Bright Curved Center Wave) -->
  <path d="M-80,720 C220,540 680,430 1150,600 C1550,740 1980,680 2650,400 C2700,380 2680,480 2600,560 C2000,840 1500,900 1100,750 C650,580 250,720 -80,890 Z" 
        fill="url(#silkCrest2)" filter="url(#silkBlurSoft)" opacity="0.95" />

  <!-- 6. Sharp Luminous Specular Silk Peak Line (Gleaming Satin Highlight) -->
  <path d="M-50,710 Q450,470 950,540 T1800,680 T2650,380" 
        fill="none" stroke="#ffffff" stroke-width="32" stroke-linecap="round" filter="url(#subtleGlow)" opacity="0.90" />
  <path d="M-50,710 Q450,470 950,540 T1800,680 T2650,380" 
        fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.95" />

  <!-- 7. Warm Golden Amber Radiance in the Lower Folds & Crevices -->
  <ellipse cx="280" cy="980" rx="650" ry="480" fill="url(#amberGlowMain)" filter="url(#silkBlurHeavy)" opacity="0.95" />
  <ellipse cx="780" cy="1120" rx="550" ry="380" fill="url(#amberGlowSecondary)" filter="url(#silkBlurHeavy)" opacity="0.80" />
  <ellipse cx="420" cy="1040" rx="350" ry="240" fill="url(#amberGlowPocket)" filter="url(#silkBlurMed)" opacity="0.90" />

  <!-- 8. Intense Warm Amber Fold Flare (The Sunlit Crevice in User's Image) -->
  <path d="M-40,880 C180,820 420,950 560,1180 C400,1350 150,1300 -40,1220 Z" 
        fill="#fef08a" filter="url(#silkBlurMed)" opacity="0.85" />
  <ellipse cx="220" cy="960" rx="160" ry="110" fill="#ffffff" filter="url(#silkBlurSoft)" opacity="0.95" />

  <!-- 9. Shimmering Lavender and Pink Sheen on Upper & Right Waves -->
  <ellipse cx="2050" cy="620" rx="750" ry="580" fill="url(#violetSheen)" filter="url(#silkBlurHeavy)" opacity="0.85" />
  <ellipse cx="2250" cy="1180" rx="550" ry="420" fill="url(#lilacLower)" filter="url(#silkBlurHeavy)" opacity="0.75" />

  <!-- 10. Secondary Lower Center Silk Drape Flow -->
  <path d="M350,920 C750,780 1250,880 1680,1120 C1950,1280 2300,1220 2700,1100 L2700,1500 L350,1500 Z" 
        fill="url(#silkCrest1)" filter="url(#silkBlurMed)" opacity="0.70" />

  <!-- 11. Subtle Pearl Satin Surface Sheen Vignette -->
  <rect width="2560" height="1440" fill="none" 
        stroke="rgba(255,255,255,0.25)" stroke-width="1" />
</svg>
"""

def create_dark_wallpaper():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <!-- Master Dark Silk Filters -->
    <filter id="darkBlurHeavy" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="90" result="blur" />
    </filter>
    <filter id="darkBlurMed" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="55" result="blur" />
    </filter>
    <filter id="darkBlurSoft" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="28" result="blur" />
    </filter>
    <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="38" result="blur" />
    </filter>

    <!-- Deep Cosmic Midnight Base Canvas -->
    <linearGradient id="darkBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050a19" />
      <stop offset="30%" stop-color="#081026" />
      <stop offset="60%" stop-color="#040815" />
      <stop offset="100%" stop-color="#070c20" />
    </linearGradient>

    <!-- Electric Sapphire & Royal Blue Illuminations -->
    <radialGradient id="sapphireFold" cx="35%" cy="30%" r="55%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.90" />
      <stop offset="35%" stop-color="#2563eb" stop-opacity="0.75" />
      <stop offset="65%" stop-color="#1d4ed8" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="electricBlueRidge" cx="55%" cy="58%" r="45%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#3b82f6" stop-opacity="0.80" />
      <stop offset="60%" stop-color="#1e40af" stop-opacity="0.40" />
      <stop offset="100%" stop-color="#020617" stop-opacity="0" />
    </radialGradient>

    <!-- Luminous Royal Violet & Ultraviolet Crests (Right Folds) -->
    <radialGradient id="violetRidge" cx="80%" cy="38%" r="50%">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="30%" stop-color="#9333ea" stop-opacity="0.80" />
      <stop offset="65%" stop-color="#6b21a8" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#3b0764" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="magentaLower" cx="88%" cy="82%" r="40%">
      <stop offset="0%" stop-color="#e879f9" stop-opacity="0.90" />
      <stop offset="35%" stop-color="#c026d3" stop-opacity="0.70" />
      <stop offset="70%" stop-color="#701a75" stop-opacity="0.30" />
      <stop offset="100%" stop-color="#050510" stop-opacity="0" />
    </radialGradient>

    <!-- Molten Golden Amber Glows (Lower Left & Crevice) -->
    <radialGradient id="darkAmberMain" cx="15%" cy="68%" r="45%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.98" />
      <stop offset="20%" stop-color="#fbbf24" stop-opacity="0.88" />
      <stop offset="45%" stop-color="#f59e0b" stop-opacity="0.65" />
      <stop offset="75%" stop-color="#b45309" stop-opacity="0.30" />
      <stop offset="100%" stop-color="#78350f" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="darkAmberPocket" cx="28%" cy="75%" r="28%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#fde68a" stop-opacity="0.85" />
      <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#92400e" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="darkAmberSecondary" cx="62%" cy="80%" r="35%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.85" />
      <stop offset="35%" stop-color="#f59e0b" stop-opacity="0.60" />
      <stop offset="70%" stop-color="#b45309" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Silky Specular Edge Highlights -->
    <linearGradient id="darkSilkEdge" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="20%" stop-color="#93c5fd" stop-opacity="0.80" />
      <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.40" />
      <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0" />
    </linearGradient>

    <!-- Deep Velvet Shadow Creases -->
    <linearGradient id="midnightCrease" x1="20%" y1="10%" x2="80%" y2="90%">
      <stop offset="0%" stop-color="#02040b" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#050a18" stop-opacity="0.60" />
      <stop offset="100%" stop-color="#0a1228" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- 1. Deep Midnight Base Canvas -->
  <rect width="2560" height="1440" fill="url(#darkBase)" />

  <!-- 2. Electric Sapphire Upper Left Waves -->
  <ellipse cx="650" cy="180" rx="800" ry="500" fill="url(#sapphireFold)" filter="url(#darkBlurHeavy)" opacity="0.85" />

  <!-- 3. Sweeping Midnight Crease Shadow -->
  <path d="M-50,650 C380,480 750,420 1200,650 C1650,880 2050,750 2700,520 L2700,950 C2100,1150 1600,1150 1100,950 C600,750 200,880 -50,1050 Z" 
        fill="url(#midnightCrease)" filter="url(#darkBlurMed)" opacity="0.85" />

  <!-- 4. Glowing Electric Blue Ribbon Curve Across Center -->
  <path d="M-80,720 C220,540 680,430 1150,600 C1550,740 1980,680 2650,400 C2700,380 2680,480 2600,560 C2000,840 1500,900 1100,750 C650,580 250,720 -80,890 Z" 
        fill="url(#electricBlueRidge)" filter="url(#darkBlurSoft)" opacity="0.90" />

  <!-- 5. Brilliant Specular Ridge Line (Satin Reflection) -->
  <path d="M-50,710 Q450,470 950,540 T1800,680 T2650,380" 
        fill="none" stroke="#93c5fd" stroke-width="24" stroke-linecap="round" filter="url(#neonGlow)" opacity="0.85" />
  <path d="M-50,710 Q450,470 950,540 T1800,680 T2650,380" 
        fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.95" />

  <!-- 6. Ultraviolet & Violet Radiant Folds (Right Side) -->
  <ellipse cx="2050" cy="580" rx="750" ry="580" fill="url(#violetRidge)" filter="url(#darkBlurHeavy)" opacity="0.90" />
  <ellipse cx="2250" cy="1180" rx="550" ry="420" fill="url(#magentaLower)" filter="url(#darkBlurHeavy)" opacity="0.85" />

  <!-- 7. Molten Golden Amber Glowing Waves (Lower Left Crevice & Valleys) -->
  <ellipse cx="280" cy="980" rx="650" ry="480" fill="url(#darkAmberMain)" filter="url(#darkBlurHeavy)" opacity="0.98" />
  <ellipse cx="780" cy="1120" rx="550" ry="380" fill="url(#darkAmberSecondary)" filter="url(#darkBlurHeavy)" opacity="0.85" />
  <ellipse cx="420" cy="1040" rx="350" ry="240" fill="url(#darkAmberPocket)" filter="url(#darkBlurMed)" opacity="0.95" />

  <!-- 8. Blazing Amber Pocket Flare (The Exact Hotspot in the User's Image) -->
  <path d="M-40,880 C180,820 420,950 560,1180 C400,1350 150,1300 -40,1220 Z" 
        fill="#f59e0b" filter="url(#darkBlurMed)" opacity="0.90" />
  <ellipse cx="220" cy="960" rx="140" ry="90" fill="#fef08a" filter="url(#darkBlurSoft)" opacity="0.98" />
  <ellipse cx="210" cy="955" rx="60" ry="40" fill="#ffffff" opacity="0.90" />

  <!-- 9. Secondary Cyan/Cobalt Lower Drape -->
  <path d="M350,920 C750,780 1250,880 1680,1120 C1950,1280 2300,1220 2700,1100 L2700,1500 L350,1500 Z" 
        fill="#1d4ed8" filter="url(#darkBlurMed)" opacity="0.55" />
</svg>
"""

os.makedirs("public", exist_ok=True)

with open("public/wallpaper-light.svg", "w", encoding="utf-8") as f:
    f.write(create_light_wallpaper())

with open("public/wallpaper-dark.svg", "w", encoding="utf-8") as f:
    f.write(create_dark_wallpaper())

print("Successfully generated public/wallpaper-light.svg and public/wallpaper-dark.svg")
