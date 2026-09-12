import fs from "fs";
import path from "path";
import sharp from "sharp";

const publicDir = path.resolve("./public");
const avatarsDir = path.resolve("./public/avatars");

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// 1. Generate high-resolution REEC Logo (Blue Rust Cogwheel)
const logoSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background glow filter -->
    <radialGradient id="neonHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00aaff" stop-opacity="0.9"/>
      <stop offset="35%" stop-color="#0066ff" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="#002288" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Metallic blue surface gradient -->
    <linearGradient id="metalBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#93c5fd"/>
      <stop offset="25%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#1d4ed8"/>
      <stop offset="75%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>

    <!-- Edge Specular Rim -->
    <linearGradient id="rimSpecular" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.9"/>
    </linearGradient>

    <!-- Drop shadows -->
    <filter id="gearGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="24" flood-color="#00b4d8" flood-opacity="0.9"/>
      <feDropShadow dx="0" dy="0" stdDeviation="60" flood-color="#0077b6" flood-opacity="0.6"/>
    </filter>
    <filter id="rShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#05102a" flood-opacity="0.95"/>
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#38bdf8" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Deep space obsidian background -->
  <rect width="1024" height="1024" fill="#04060d"/>

  <!-- Intense Cyan Halo Background -->
  <circle cx="512" cy="512" r="480" fill="url(#neonHalo)"/>

  <!-- Outer Ring with Bevel -->
  <g filter="url(#gearGlow)">
    <circle cx="512" cy="512" r="435" fill="none" stroke="url(#rimSpecular)" stroke-width="12"/>
    <circle cx="512" cy="512" r="418" fill="none" stroke="#00d4ff" stroke-width="3" opacity="0.8"/>
    <circle cx="512" cy="512" r="405" fill="none" stroke="url(#metalBlue)" stroke-width="16"/>
  </g>

  <!-- Rust Cogwheel Gear Base & Teeth -->
  <g filter="url(#gearGlow)">
    ${Array.from({ length: 32 })
      .map((_, i) => {
        const angle = (i * 360) / 32;
        return `<rect x="494" y="98" width="36" height="42" rx="4" transform="rotate(${angle} 512 512)" fill="url(#metalBlue)" stroke="#67e8f9" stroke-width="2"/>`;
      })
      .join("\n    ")}
    <!-- Inner gear body -->
    <circle cx="512" cy="512" r="388" fill="url(#metalBlue)" stroke="#7dd3fc" stroke-width="5"/>
    <circle cx="512" cy="512" r="375" fill="none" stroke="#1e3a8a" stroke-width="8" opacity="0.6"/>
  </g>

  <!-- 5 Circular Cutouts (Rust gear holes) -->
  ${[0, 72, 144, 216, 288]
    .map((deg) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      const cx = 512 + Math.cos(rad) * 265;
      const cy = 512 + Math.sin(rad) * 265;
      return `
      <g>
        <circle cx="${cx}" cy="${cy}" r="38" fill="#04060d" stroke="#38bdf8" stroke-width="6"/>
        <circle cx="${cx}" cy="${cy}" r="43" fill="none" stroke="#0f172a" stroke-width="3"/>
      </g>`;
    })
    .join("\n")}

  <!-- Central Rust Monogram "R" with Precision 3D Geometry -->
  <g filter="url(#rShadow)">
    <!-- Base R shape in bold metallic texture -->
    <path d="
      M 330 355
      H 430
      V 425
      H 455
      C 570 425, 675 440, 675 510
      C 675 570, 610 605, 545 615
      L 665 725
      H 705
      V 755
      H 565
      L 460 635
      H 430
      V 755
      H 330
      Z
      M 430 480
      V 580
      H 495
      C 555 580, 595 565, 595 528
      C 595 495, 555 480, 495 480
      Z
    " fill="url(#metalBlue)" stroke="#bae6fd" stroke-width="8" stroke-linejoin="round"/>

    <!-- Specular highlight bevel on R -->
    <path d="
      M 335 360
      H 425
      V 430
      H 455
      C 565 430, 665 445, 665 510
      C 665 565, 605 598, 540 610
      L 655 720
    " fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.75"/>
  </g>
</svg>
`;

async function main() {
  console.log("Rendering REEC Logo (logo.png)...");
  const logoBuffer = await sharp(Buffer.from(logoSvg))
    .resize(1024, 1024)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, "logo.png"), logoBuffer);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), logoBuffer);
  
  const appDir = path.resolve("./app");
  if (fs.existsSync(appDir)) {
    fs.writeFileSync(path.join(appDir, "favicon.ico"), logoBuffer);
    fs.writeFileSync(path.join(appDir, "icon.png"), logoBuffer);
  }

  console.log("logo.png generated successfully.");

  // 2. Generate Male Profiles Grid and Individual Portraits
  // Alex (Systems), Marcus (Kernel), David (Compiler), Ryan (Embedded)
  const maleAvatars = [
    {
      id: "male-alex",
      name: "Alex",
      role: "Systems Engineer",
      cardBg: "#eff6ff",
      circleBg: "#3b82f6",
      hoodieColor: "#0f172a",
      hairColor: "#1e293b",
      skinColor: "#fed7aa",
      hasGlasses: true,
      hoodieText: "REEC",
      prop: "laptop",
    },
    {
      id: "male-marcus",
      name: "Marcus",
      role: "Kernel Architect",
      cardBg: "#fff7ed",
      circleBg: "#ea580c",
      hoodieColor: "#18181b",
      hairColor: "#09090b",
      skinColor: "#c2410c",
      hasGlasses: false,
      hoodieText: "REEC",
      prop: "none",
    },
    {
      id: "male-david",
      name: "David",
      role: "Compiler Specialist",
      cardBg: "#f0fdf4",
      circleBg: "#059669",
      hoodieColor: "#064e3b",
      hairColor: "#451a03",
      skinColor: "#ffedd5",
      hasGlasses: true,
      hoodieText: "REEC",
      prop: "chin",
    },
    {
      id: "male-ryan",
      name: "Ryan",
      role: "Embedded Developer",
      cardBg: "#faf5ff",
      circleBg: "#7c3aed",
      hoodieColor: "#581c87",
      hairColor: "#18181b",
      skinColor: "#fed7aa",
      hasGlasses: false,
      hoodieText: "REEC",
      prop: "none",
    },
  ];

  // 3. Generate Female Profiles Grid and Individual Portraits
  // Ava (Systems), Maya (Kernel), Sara (Compiler), Lily (Embedded)
  const femaleAvatars = [
    {
      id: "female-ava",
      name: "Ava",
      role: "Systems Engineer",
      cardBg: "#eff6ff",
      circleBg: "#38bdf8",
      hoodieColor: "#0f172a",
      hairColor: "#1e293b",
      skinColor: "#ffedd5",
      hasGlasses: true,
      hairStyle: "long",
      hoodieText: "REEC",
      prop: "laptop",
    },
    {
      id: "female-maya",
      name: "Maya",
      role: "Kernel Architect",
      cardBg: "#fff7ed",
      circleBg: "#f97316",
      hoodieColor: "#18181b",
      hairColor: "#1c1917",
      skinColor: "#fed7aa",
      hasGlasses: false,
      hairStyle: "bun",
      hoodieText: "REEC",
      prop: "chin",
    },
    {
      id: "female-sara",
      name: "Sara",
      role: "Compiler Specialist",
      cardBg: "#f0fdf4",
      circleBg: "#10b981",
      hoodieColor: "#064e3b",
      hairColor: "#1e293b",
      skinColor: "#fde68a",
      hasGlasses: true,
      hairStyle: "long",
      hoodieText: "REEC",
      prop: "pen",
    },
    {
      id: "female-lily",
      name: "Lily",
      role: "Embedded Developer",
      cardBg: "#faf5ff",
      circleBg: "#a855f7",
      hoodieColor: "#18181b",
      hairColor: "#581c87",
      skinColor: "#ffedd5",
      hasGlasses: false,
      hairStyle: "wavy-purple",
      hoodieText: "REEC",
      prop: "board",
    },
  ];

  function renderSingleAvatarSvg(av, isFemale = false, size = 512) {
    return `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="circleClip">
      <circle cx="256" cy="256" r="230"/>
    </clipPath>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="${av.circleBg}" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="512" height="512" rx="64" fill="${av.cardBg}"/>

  <!-- Circular Avatar Frame with Drop Shadow -->
  <g filter="url(#softGlow)">
    <circle cx="256" cy="220" r="160" fill="${av.circleBg}"/>
  </g>

  <!-- Clipped Character Illustration -->
  <g clip-path="url(#circleClip)">
    <!-- Shoulders & Hoodie -->
    <path d="M 120 440 C 120 340, 180 300, 256 300 C 332 300, 392 340, 392 440 Z" fill="${av.hoodieColor}"/>

    <!-- REEC Hoodie Branding -->
    <text x="256" y="385" text-anchor="middle" fill="#ffffff" font-family="-apple-system, sans-serif" font-weight="900" font-size="26" letter-spacing="3">REEC</text>

    <!-- Neck -->
    <rect x="232" y="250" width="48" height="60" rx="16" fill="${av.skinColor}"/>

    ${
      isFemale
        ? `
      <!-- Female Hair Back -->
      ${
        av.hairStyle === "bun"
          ? `<circle cx="256" cy="75" r="45" fill="${av.hairColor}"/>`
          : `<path d="M 155 170 C 155 80, 357 80, 357 170 C 370 260, 360 320, 340 350 C 330 260, 330 210, 320 180 C 310 120, 202 120, 192 180 C 182 210, 182 260, 172 350 C 152 320, 142 260, 155 170 Z" fill="${av.hairColor}"/>`
      }
    `
        : ""
    }

    <!-- Head / Face -->
    <ellipse cx="256" cy="185" rx="72" ry="85" fill="${av.skinColor}"/>

    <!-- Male / Short Hair Front -->
    ${
      !isFemale
        ? `
      <path d="M 175 160 C 175 90, 220 70, 256 70 C 300 70, 337 90, 337 150 C 337 165, 320 150, 300 140 C 270 125, 230 130, 200 145 C 185 152, 175 165, 175 160 Z" fill="${av.hairColor}"/>
    `
        : `
      <!-- Female Hair Bangs -->
      <path d="M 180 160 C 185 105, 220 85, 256 85 C 295 85, 328 105, 332 160 C 320 135, 290 120, 256 125 C 220 120, 195 135, 180 160 Z" fill="${av.hairColor}"/>
    `
    }

    <!-- Eyebrows -->
    <path d="M 205 160 Q 220 152 235 160" stroke="${av.hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 277 160 Q 292 152 307 160" stroke="${av.hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>

    <!-- Eyes (Big animated anime-style friendly eyes) -->
    <circle cx="220" cy="180" r="14" fill="#0f172a"/>
    <circle cx="292" cy="180" r="14" fill="#0f172a"/>
    <circle cx="216" cy="176" r="5" fill="#ffffff"/>
    <circle cx="288" cy="176" r="5" fill="#ffffff"/>

    ${
      av.hasGlasses
        ? `
      <!-- Stylish Modern Black Glasses -->
      <rect x="195" y="160" width="50" height="38" rx="12" fill="none" stroke="#09090b" stroke-width="6"/>
      <rect x="267" y="160" width="50" height="38" rx="12" fill="none" stroke="#09090b" stroke-width="6"/>
      <path d="M 245 175 H 267" stroke="#09090b" stroke-width="6"/>
    `
        : ""
    }

    <!-- Cute Nose -->
    <path d="M 254 198 Q 256 206 261 204" stroke="#c2410c" stroke-width="3" fill="none" stroke-linecap="round"/>

    <!-- Friendly Smile -->
    <path d="M 235 224 Q 256 242 277 224" stroke="#991b1b" stroke-width="4" fill="none" stroke-linecap="round"/>

    ${
      av.prop === "laptop"
        ? `
      <!-- Laptop in hand -->
      <g transform="translate(290, 310) rotate(-10)">
        <rect x="0" y="0" width="100" height="65" rx="6" fill="#94a3b8" stroke="#cbd5e1" stroke-width="3"/>
        <circle cx="50" cy="32" r="12" fill="#e2e8f0"/>
      </g>
    `
        : av.prop === "board"
        ? `
      <!-- Embedded Microcontroller Raspberry Pi Board -->
      <g transform="translate(295, 290) rotate(15)">
        <rect x="0" y="0" width="75" height="55" rx="4" fill="#15803d" stroke="#22c55e" stroke-width="2"/>
        <rect x="10" y="10" width="22" height="22" rx="2" fill="#0f172a"/>
        <circle cx="55" cy="20" r="5" fill="#eab308"/>
        <circle cx="55" cy="35" r="5" fill="#eab308"/>
      </g>
    `
        : ""
    }
  </g>

  <!-- Name & Title Label -->
  <text x="256" y="440" text-anchor="middle" fill="#0f172a" font-family="-apple-system, sans-serif" font-weight="800" font-size="28">${av.name}</text>
  <text x="256" y="470" text-anchor="middle" fill="#64748b" font-family="-apple-system, sans-serif" font-weight="600" font-size="19">${av.role}</text>
</svg>
`;
  }

  // Generate individual avatar PNGs
  for (const av of maleAvatars) {
    const svg = renderSingleAvatarSvg(av, false, 512);
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    fs.writeFileSync(path.join(avatarsDir, `${av.id}.png`), buf);
  }

  for (const av of femaleAvatars) {
    const svg = renderSingleAvatarSvg(av, true, 512);
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    fs.writeFileSync(path.join(avatarsDir, `${av.id}.png`), buf);
  }

  // 4. Generate composite 2x2 grid for profiles(male).jpeg and profiles(female).jpeg
  function renderCompositeGridSvg(avatars, isFemale = false) {
    return `
<svg width="1536" height="1024" viewBox="0 0 1536 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1536" height="1024" fill="#ffffff"/>
  <!-- 2x2 Grid -->
  <g transform="translate(48, 48)">
    <g transform="translate(0, 0)">
      <svg width="680" height="440" viewBox="0 0 512 512">
        ${renderSingleAvatarSvg(avatars[0], isFemale, 512).replace(/<\/?svg[^>]*>/g, "")}
      </svg>
    </g>
    <g transform="translate(760, 0)">
      <svg width="680" height="440" viewBox="0 0 512 512">
        ${renderSingleAvatarSvg(avatars[1], isFemale, 512).replace(/<\/?svg[^>]*>/g, "")}
      </svg>
    </g>
    <g transform="translate(0, 488)">
      <svg width="680" height="440" viewBox="0 0 512 512">
        ${renderSingleAvatarSvg(avatars[2], isFemale, 512).replace(/<\/?svg[^>]*>/g, "")}
      </svg>
    </g>
    <g transform="translate(760, 488)">
      <svg width="680" height="440" viewBox="0 0 512 512">
        ${renderSingleAvatarSvg(avatars[3], isFemale, 512).replace(/<\/?svg[^>]*>/g, "")}
      </svg>
    </g>
  </g>
</svg>
`;
  }

  console.log("Generating profiles(male).jpeg and profiles(female).jpeg...");
  const maleGridSvg = renderCompositeGridSvg(maleAvatars, false);
  const maleGridBuf = await sharp(Buffer.from(maleGridSvg)).jpeg({ quality: 95 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, "profiles(male).jpeg"), maleGridBuf);
  fs.writeFileSync(path.join(publicDir, "profile(male).jpeg"), maleGridBuf);
  fs.writeFileSync(path.join(publicDir, "profiles-male.jpeg"), maleGridBuf);

  const femaleGridSvg = renderCompositeGridSvg(femaleAvatars, true);
  const femaleGridBuf = await sharp(Buffer.from(femaleGridSvg)).jpeg({ quality: 95 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, "profiles(female).jpeg"), femaleGridBuf);
  fs.writeFileSync(path.join(publicDir, "profiles-female.jpeg"), femaleGridBuf);

  console.log("All image assets generated successfully!");
}

main().catch(console.error);
