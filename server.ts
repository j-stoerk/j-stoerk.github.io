import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header for telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Initial high-quality pre-seeded lessons to ensure instant playability out of the box
const mockCards = [
  {
    id: "preseed_1",
    subject: "Space & Physics",
    title: "Why Time Dilates Near a Black Hole",
    creator: "@astro_einstein",
    hashtags: ["einstein", "physics", "blackhole", "relativity", "curio"],
    backgroundNotation: "dτ = dt * √(1 - 2GM/(r c²))",
    content: "Einstein's General Relativity tells us that gravity isn't just a force, but the warping of spacetime! The stronger the gravity (high mass like a black hole), the more spacetime bends. This warping actually stretches time itself. If you spent 1 hour near Sagittarius A* (the black hole at our galaxy's center), decades or even centuries would pass for someone far away on Earth. Gravity literally slows the ticking of cosmic clocks!",
    detailedTheory: "Einstein's Field Equations mathematically establish that stress-energy tensor components bend spacetime geometry. In Schwarzschild geometry, the proper time interval dτ is defined by: dτ = dt * √(1 - 2GM/(r c²)). As distance r approaches the event horizon, coordinate time stretches toward infinity relative to proper time. An observer falling into a black hole experiences time locally at a normal rate, but an observer stationed infinitely far away watches the falling subject freeze visually at the horizon boundary.",
    mediaType: "video_simulation" as const,
    animationType: "orbital" as const,
    quiz: {
      question: "According to General Relativity, why does time tick slower near a black hole?",
      options: [
        "The extreme cold of space freezes the mechanical parts of clocks",
        "Massive gravity warps and stretches the fabric of spacetime itself",
        "The speed of light slows down because of the intense magnetic fields",
        "Frictional forces from stellar dust slow down atomic movements"
      ],
      correctAnswerIndex: 1,
      explanation: "Massive objects warp gravity, which in turn stretches spacetime. This causes time to pass slower relative to an observer far away from the gravity source!"
    },
    likes: 8432,
    bookmarks: 3921,
    shares: 1102,
    comments: [
      { id: "c1_1", username: "gravity_fanatic", text: "Wait, so if I fell in, would I see the future of the universe pass instantly?", likes: 142, timestamp: "2h ago" },
      { id: "c1_2", username: "science_is_art", text: "This visual makes the geometry so clear!", likes: 88, timestamp: "5h ago" },
      { id: "c1_3", username: "Curio AI", text: "Excellent question @gravity_fanatic! From your perspective, you'd fall through normally but looking back, you would see external light blueshifted and events in the outside world speeding up dramatically!", likes: 231, timestamp: "1h ago", isAiResponse: true }
    ]
  },
  {
    id: "preseed_2",
    subject: "World History",
    title: "The Tragic Myth of the Library of Alexandria",
    creator: "@history_unveiled",
    hashtags: ["alexandria", "ancient", "history", "library", "myths"],
    backgroundNotation: "LATITUDE 31.2001° N · LONGITUDE 29.9187° E",
    content: "The spectacular Library of Alexandria in Egypt did not burn down in a single catastrophic night! While popular lore blames Julius Caesar in 48 BC for its total destruction, the library actually suffered a long, painful decline over centuries. Funding cuts, secondary fires during city siege, and religious decrees slowly reduced the greatest collection of human knowledge to ruins. It was a centuries-long intellectual decay, not a single dramatic blaze.",
    detailedTheory: "Historical records show that the destruction of the Great Library was a gradual degradation. While Julius Caesar accidentally burned part of the fleet and adjacent dock warehouses in 48 BC, the main museum facility was active for centuries. Major milestones of decline include the siege of Alexandria by Aurelian in 270 AD, the absolute destruction of the daughter library Serapeum following Emperor Theodosius's pagan temple decree in 391 AD, and final degradation during the Arab conquest in 642 AD.",
    mediaType: "infographic" as const,
    animationType: "timeline" as const,
    quiz: {
      question: "What is the historical truth regarding the destruction of the Library of Alexandria?",
      options: [
        "It was completely destroyed in 10 minutes by a sudden meteor strike",
        "Julius Caesar systematically gathered and burned all scrolls in a parade",
        "It suffered a gradual decline, fires, and loss of funding over centuries",
        "All the knowledge was stolen and relocated to a secret island"
      ],
      correctAnswerIndex: 2,
      explanation: "Historians agree that the library's demise was a slow process over hundreds of years, caused by decay, multiple conflicts, and political updates, rather than one single fire."
    },
    likes: 6210,
    bookmarks: 2843,
    shares: 512,
    comments: [
      { id: "c2_1", username: "cleopatra_vii", text: "Finally, someone debunked the Caesar-only myth. The Romans always get too much blame!", likes: 95, timestamp: "10h ago" },
      { id: "c2_2", username: "scroll_collector", text: "Just imagine how many lost works of Aristarchus and Eratosthenes were in there...", likes: 154, timestamp: "8h ago" }
    ]
  },
  {
    id: "preseed_3",
    subject: "Biology & Chemistry",
    title: "How Plants Steal Sunbeams: Photosynthesis",
    creator: "@biosphere_pro",
    hashtags: ["plants", "chlorophyll", "chemistry", "sunlight", "science"],
    backgroundNotation: "6 CO₂ + 6 H₂O + PHOTONS ➔ C₆H₁₂O₆ + 6 O₂",
    content: "Inside every green leaf, a masterpiece of quantum hardware takes place! Chloroplasts absorb photon packets of sunlight. This energy splits stable water molecules (H2O), freeing oxygen as waste (thank you, plants!) and trapping the high-energy electrons. These electrons are shuffled down a chain to fuel the assembly of glucose from carbon dioxide. Plants literally construct their massive wood and leaves out of thin air, water, and pure sunlight!",
    detailedTheory: "Photosynthesis operates via light-dependent and light-independent pathways. Within the thylakoid membrane, Photosystem II absorbs a photon, exciting an electron that is replaced by enzymatically splitting water. This releases molecular oxygen (O₂) and protons. Traveling down electron transport chains, the generated NADPH and ATP then power the Calvin Cycle (light-independent reaction), wherein the enzyme RuBisCO fixes CO₂ from the air directly into organic carbon compounds.",
    mediaType: "video_simulation" as const,
    animationType: "dna_helix" as const,
    quiz: {
      question: "Where do plants get the physical carbon atoms to build their solid branches and leaves?",
      options: [
        "From organic components absorbed directly through the root system",
        "From atmospheric Carbon Dioxide (CO2) captured from the air",
        "From decaying mineral rocks dissolved in soil water",
        "By synthesizing carbon directly from water photons"
      ],
      correctAnswerIndex: 1,
      explanation: "Plants construct their structures out of carbon atoms extracted from the air (carbon dioxide) through carbon fixation, not from elements in the soil!"
    },
    likes: 9140,
    bookmarks: 4501,
    shares: 2013,
    comments: [
      { id: "c3_1", username: "oak_tree_huge", text: "So when wood burns, it's basically releasing stored ancient sunlight?", likes: 281, timestamp: "13h ago" },
      { id: "c3_2", username: "Curio AI", text: "Spot on @oak_tree_huge! Burning wood releases that captured solar energy as heat and light, turning the solid carbon back into gas. It's the cycle of life in reverse!", likes: 198, timestamp: "12h ago", isAiResponse: true }
    ]
  },
  {
    id: "preseed_4",
    subject: "Math & Computer Science",
    title: "What makes Binary Search so blazingly fast?",
    creator: "@code_ninja",
    hashtags: ["coding", "algorithms", "computerscience", "binarysearch", "math"],
    backgroundNotation: "T(N) = T(N/2) + O(1) ➔ O(LOG N)",
    content: "Imagine searching for a name in a physical phonebook of 1 million entries. If you checked page-by-page (Linear Search), it would take up to 1 million steps. But with Binary Search, you open it right in the middle. Is your name earlier or later? You throw away half the book! Open the remaining half in the middle, repeat. Each step halves the remaining candidates. In just 20 cuts, you've pinpointed exactly 1 entry among 1,000,000. That's logarithm complexity O(log n) as a superpower!",
    detailedTheory: "Binary Search operates by computing a middle index mid = low + ⌊(high-low)/2⌋ and comparisons in a sorted array to halve the search space at each stage. This recurrent relationship defines a maximum of O(log n) operations. For 2³⁰ (~1.07B) items, it resolves in at most 30 lookup stages, while linear searches would average 536 million iterations, making sorted indices highly performant for database lookups.",
    mediaType: "video_simulation" as const,
    animationType: "geometry" as const,
    quiz: {
      question: "What is the critical requirement for a list before you can apply Binary Search?",
      options: [
        "The list must contain only prime numbers and empty spaces",
        "The list must be sorted in order (increasing or decreasing)",
        "The list must have an odd number of items to find a clear middle",
        "The list must be encrypted with a cryptographical algorithm"
      ],
      correctAnswerIndex: 1,
      explanation: "Binary Search relies on sorted order. If a list is unsorted, we cannot throw away half the search space because we don't know which side our target is on!"
    },
    likes: 12053,
    bookmarks: 7212,
    shares: 4323,
    comments: [
      { id: "c4_1", username: "debugger_dan", text: "O(log n) is the closest thing to magic in computer science. Period.", likes: 412, timestamp: "1d ago" },
      { id: "c4_2", username: "math_majesty", text: "I love how this scales. For 1 billion items, it only takes 30 steps!", likes: 320, timestamp: "20h ago" }
    ]
  },
  {
    id: "preseed_5",
    subject: "Space & Physics",
    title: "Quantum Wave Particle Duality",
    creator: "@quant_mechanic",
    hashtags: ["quantum", "physics", "light", "waves", "schrodinger"],
    backgroundNotation: "λ = h / p · iħ ∂Ψ/∂t = ĤΨ",
    content: "If you look closely enough at reality, particles are not solid blocks, and waves are not just ripples! Wave-particle duality shows us that everything—from a beam of light to an electron inside your body—acts as both a wave of probabilities and a discrete packet of energy. When we choose to measure its path, we force the probability wave to collapse into a single physical location, showing how observation defines our physical reality.",
    detailedTheory: "In mechanics, de Broglie's relation calculates a particle's wavelength as λ = h/p. The dual nature is described by Schrödinger's Wave Equation, where wavefunctions Ψ(x,t) represent amplitude probabilities. In the classic Double Slit Experiment, single particles passed through slits produce interference structures when left unobserved, but act purely as ballistic particles when a detector is placed in front of the slits, destroying coherent superposition.",
    mediaType: "video_simulation" as const,
    animationType: "reaction" as const,
    quiz: {
      question: "What destroys the wave-like interference pattern of electrons in a double-slit experiment?",
      options: [
        "Increasing the humidity inside the laboratory chamber",
        "Using a magnetic field to accelerate the electron flow",
        "Introducing an observer or detector device to split of the path",
        "Replacing the double-slit frame with a thicker material"
      ],
      correctAnswerIndex: 2,
      explanation: "The act of observing or detecting which slit the electron goes through collapses its wave function, transitioning it into particle-like ballistic trajectories!"
    },
    likes: 5410,
    bookmarks: 3120,
    shares: 981,
    comments: [
      { id: "c5_1", username: "bohr_atomic", text: "Complementarity at its absolute finest.", likes: 110, timestamp: "12h ago" },
      { id: "c5_2", username: "matter_waves", text: "The universe is literally made of probabilities.", likes: 74, timestamp: "9h ago" }
    ]
  },
  {
    id: "preseed_6",
    subject: "Biology & Chemistry",
    title: "CRISPR-Cas9 Molecular Scissors",
    creator: "@gene_architect",
    hashtags: ["crispr", "dna", "genetics", "biotech", "chemistry"],
    backgroundNotation: "gRNA + CAS9 PROTEIN ➔ DSB EDIT SYSTEM",
    content: "Imagine a search-and-replace command, but for the actual scroll of DNA inside a living cell! CRISPR is a revolutionized biotech breakthrough turned molecular software. It pairs a customizable guide RNA with a protein enzyme named Cas9. The guide RNA steers Cas9 to a highly specific address in the 3-billion-letter genome, where it snips the double helix, allowing scientists to disable bad genes or insert healthy genes with pixel perfection.",
    detailedTheory: "The Clustered Regularly Interspaced Short Palindromic Repeats (CRISPR) immunologic pathway was discovered in bacteria fighting off phage viruses. The Cas9 endonuclease forms an active complex with guide RNA (gRNA), scanning genomic sequences for a Protospacer Adjacent Motif (PAM). Once bound, Cas9 creates double-strand breaks (DSB). The cellular response repairs this breach via non-homologous end-joining (NHEJ) which inserts mutations, or homology-directed repair (HDR) which incorporates healthy donor DNA templates.",
    mediaType: "video_simulation" as const,
    animationType: "dna_helix" as const,
    quiz: {
      question: "How does the Cas9 enzyme find the exact address on the DNA to cut?",
      options: [
        "It uses a heat-seeking magnetic current in the nucleus",
        "It is directed by a synthetic guide RNA matching the target code",
        "It follows a chemical sugar trail left by damaged cells",
        "It systematically checks all 3 billion letters starting from page one"
      ],
      correctAnswerIndex: 1,
      explanation: "Cas9 is bound to a guide RNA (gRNA). The gRNA has a sequence designed to match the targeted address perfectly, steering the enzyme precisely where it must cut!"
    },
    likes: 7120,
    bookmarks: 4053,
    shares: 1621,
    comments: [
      { id: "c6_1", username: "double_helix", text: "This is literally editing the source code of biological life.", likes: 212, timestamp: "1d ago" },
      { id: "c6_2", username: "bio_ethic", text: "An incredibly powerful tool. With great power comes immense responsibility.", likes: 95, timestamp: "18h ago" }
    ]
  },
  {
    id: "preseed_7",
    subject: "Math & Computer Science",
    title: "Public-Key Cryptography and RSA",
    creator: "@crypto_crypt",
    hashtags: ["security", "math", "cryptography", "primes", "modular"],
    backgroundNotation: "C = M^E MOD N · D = E^-1 MOD φ(N)",
    content: "How do you send a private lock and key to someone over the public internet when everyone is listening? You use asymmetric cryptography! Instead of sharing one key, you generate a Public Key (anyone can lock messages with it) and a Private Key (only you can unlock them). The secret math rests on prime factorization: multiplication is incredibly simple, but finding the original primes of a huge number takes computers billions of years!",
    detailedTheory: "The RSA algorithm uses two distinct large prime factors, P and Q, to compute a modulus N = P * Q. The totient φ(N) is computed as (P-1)*(Q-1). An public exponent E is chosen relative prime to φ(N). The private key D is the modular multiplicative inverse: D = E⁻¹ mod φ(N). Encryption maps a message M to ciphertext C via: C = M^E mod N. Decryption is computed as: M = C^D mod N. Reversing this without knowing P and Q requires solving the prime factoring problem.",
    mediaType: "video_simulation" as const,
    animationType: "geometry" as const,
    quiz: {
      question: "Why is RSA asymmetric cryptography secure against standard computers?",
      options: [
        "Supercomputers do not have enough electricity to process simple modulo division",
        "Factoring the product of two massive prime numbers is computationally infeasible",
        "The cryptographic keys are constantly modified every nanosecond of transmission",
        "It wraps the public code inside complex analog radio waves"
      ],
      correctAnswerIndex: 1,
      explanation: "Multiplying two primes is simple, but factoring their product back into P and Q is an extremely hard mathematical problem that would take modern systems thousands of years!"
    },
    likes: 8320,
    bookmarks: 5210,
    shares: 1395,
    comments: [
      { id: "c7_1", username: "primetime", text: "Pure number theory keeping my credit card information secure. Majestic.", likes: 312, timestamp: "2d ago" },
      { id: "c7_2", username: "cyber_sentinel", text: "Once quantum computers arrive with Shor's algorithm, this math changes completely...", likes: 189, timestamp: "1d ago" }
    ]
  },
  {
    id: "preseed_8",
    subject: "World History",
    title: "The Antikythera Analog Computer",
    creator: "@ancient_gears",
    hashtags: ["greece", "tech", "antikythera", "archaeology", "astronomy"],
    backgroundNotation: "METONIC GEARS 235 LUNAR MOTIONS · 19 YEARS",
    content: "In 1901, divers exploring an ancient shipwreck off a Greek island pulled up a green, corroded lump of bronze. It turned out to be the Antikythera Mechanism, a 2,000-year-old analog computer! Composed of over 30 intricate bronze gears, it accurately tracked the cycles of the sun, the phases of the moon, and calculated future planetary eclipses. Modern engineers were shocked; technology of this complexity did not reappear in our civilization for over 1,500 years!",
    detailedTheory: "The Antikythera Mechanism dates back to circa 150-100 BC. It utilized a differential gear system to calculate the Metonic dial—a 19-year calendar cycle containing 235 lunar months—and a Saros dial representing eclipse predictions. It even shifted gear velocity using an eccentric shaft pin-and-slot mechanism to mimic Kepler's second law of planetary orbits before ellipses were mathematically formalised, outputting coordinates mechanically.",
    mediaType: "infographic" as const,
    animationType: "timeline" as const,
    quiz: {
      question: "What functional astronomical cycles did the Antikythera Mechanism mechanically predict?",
      options: [
        "The exact trajectory of nearby stellar meteor collisions",
        "Solar/lunar cycles, eclipse dates, and prime panhellenic game years",
        "The magnetic shifts of the Mediterranean trade winds",
        "The expansion diameter of our Milky Way gravity fields"
      ],
      correctAnswerIndex: 1,
      explanation: "The mechanical calculations tracked solar and lunar positions, Metonic calendars, the Saros cycle for solar/lunar eclipses, and dates of ancient games like the Olympics!"
    },
    likes: 9540,
    bookmarks: 4980,
    shares: 1845,
    comments: [
      { id: "c8_1", username: "archaeo_tech", text: "This is physical proof that technological progress is not always linear.", likes: 450, timestamp: "2d ago" },
      { id: "c8_2", username: "mechanist", text: "Pin-and-slot gear systems to model orbital velocity changes... standard of brilliant engineering!", likes: 382, timestamp: "1d ago" }
    ]
  }
];

// Memory database for user generated cards during this container's session
const userGeneratedCards: any[] = [];

// API to list all cards (both preseeded and user custom ones)
app.get("/api/cards", (req, res) => {
  res.json({ cards: [...mockCards, ...userGeneratedCards] });
});

// API to generate a new card on ANY subject dynamically using Gemini!
app.post("/api/generate", async (req, res) => {
  const { topic, subject } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: "Please provide a training topic or subject prompt!" });
  }

  if (!ai) {
    // Elegant fallback simulator if key is missing or not provided yet
    const fallbackCreatorNames = ["@academic_sage", "@mind_blown", "@bright_ideas", "@curiosity_hub"];
    const animationTypes: Array<'orbital' | 'timeline' | 'reaction' | 'geometry' | 'matrix' | 'dna_helix'> = 
      ["orbital", "timeline", "reaction", "geometry", "dna_helix"];
    
    // Choose a matching scientific background watermark notation based on search keyword
    let fallbackNotation = "THEORY LOGIC MODEL · α = β + γ";
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes("space") || lowerTopic.includes("physics") || lowerTopic.includes("quantum") || lowerTopic.includes("gravity")) {
      fallbackNotation = "E = MC² · Ψ(X,T) PROBABILITY FUNCTION";
    } else if (lowerTopic.includes("cell") || lowerTopic.includes("gene") || lowerTopic.includes("dna") || lowerTopic.includes("chem") || lowerTopic.includes("bio")) {
      fallbackNotation = "H₂O + CO₂ ➔ ORGANIC MATRIX COMPOUND";
    } else if (lowerTopic.includes("algorithm") || lowerTopic.includes("code") || lowerTopic.includes("binary") || lowerTopic.includes("math") || lowerTopic.includes("sort")) {
      fallbackNotation = "O(LOG N) TIME COMPLEXITY METRIC";
    } else if (lowerTopic.includes("history") || lowerTopic.includes("ancient") || lowerTopic.includes("empire") || lowerTopic.includes("war")) {
      fallbackNotation = "RECORD MATRIX · COORD CHRONOS ANNAL";
    }

    const fallbackCard = {
      id: "ai_fallback_" + Date.now(),
      subject: subject || "Custom Discoveries",
      title: `The Science of ${topic.replace(/[#@]/g, '')}`,
      creator: fallbackCreatorNames[Math.floor(Math.random() * fallbackCreatorNames.length)],
      hashtags: [topic.toLowerCase().replace(/[^a-z0-9]/g, ''), "curio", "education", "science"],
      backgroundNotation: fallbackNotation,
      content: `Here is a deep-dive micro-lesson about ${topic}. This concept captures some of the most fascinating layers of scientific inquiry. It connects fundamental laws of nature to beautiful interactive properties. Understanding this helps reveal how our universe behaves on macro and micro scales! On-the-fly learning has never been faster. Try the interactive quiz to lock in this knowledge.`,
      mediaType: "video_simulation" as const,
      animationType: animationTypes[Math.floor(Math.random() * animationTypes.length)],
      detailedTheory: `A specialized deep exploration of ${topic} involves tracing its underlying principles and structural properties. This subject features deep-seated mechanisms such as mathematical laws and physical behavior that can be queried further via the built-in Socratic Coach.`,
      quiz: {
        question: `Which of the following describes a key fundamental feature of ${topic}?`,
        options: [
          `It operates under precise, predictable scientific principles`,
          `It is completely random and cannot ever be parsed by humans`,
          `It is only visible using extreme deep space telescope arrays`,
          `It changes depending on the color of light hitting it`
        ],
        correctAnswerIndex: 0,
        explanation: "Like all robust scholarly disciplines, this topic is governed by core principles that humans have systematically tracked and analyzed over centuries!"
      },
      likes: Math.floor(Math.random() * 2000) + 100,
      bookmarks: Math.floor(Math.random() * 1000) + 50,
      shares: Math.floor(Math.random() * 500) + 10,
      comments: [
        { id: `c_ai_${Date.now()}_1`, username: "curious_mind", text: `I was always fascinated by ${topic}! Awesome summary.`, likes: 12, timestamp: "Just now" },
        { id: `c_ai_${Date.now()}_2`, username: "Curio AI", text: `Glad you like it! Let me know if you would like to test your understanding further.`, likes: 8, timestamp: "Just now", isAiResponse: true }
      ]
    };
    userGeneratedCards.unshift(fallbackCard);
    return res.json({ card: fallbackCard, isFallback: true, warning: "Using interactive layout engine (Configure GEMINI_API_KEY for true AI Generation!)" });
  }

  try {
    const prompt = `
Create an engaging, educational "Curio / feed for learning" slide page about the topic/subject: "${topic}".
Follow this strict structure, return the response EXCLUSIVELY as a JSON object of this structure. Do not wrap it in markdown block.

CRITICAL: STRICTLY DO NOT INCLUDE ANY EMOJIS, ENCODINGS OR EMOTICONS IN THE ENTIRE RESPONSE. ALL TEXT MUST BE SLEEK, SCHOLARLY, AND COGNITIVELY ENGAGING.

Type definition fields required:
{
  "title": "A short, viral, attention-grabbing title (e.g. 'Why Time Dilates Near a Black Hole')",
  "creator": "An educational social handle (e.g. '@science_guru')",
  "hashtags": ["list", "of", "4-5", "relevant", "hashtags", "lowercase"],
  "backgroundNotation": "A prominent, academic background notation, formula, coordinate, or equation summarizing the mechanism (e.g., 'dτ = dt * √(1 - 2GM/(r c²))' or 'gRNA + CAS9 ➔ DSB SYSTEM')",
  "content": "A short, highly engaging hook paragraph of 2-3 sentences. Introduce the core mechanism or fascinating truth in a fun, accessible, mind-blowing way. NEVER use any emojis.",
  "detailedTheory": "A deeply educational, intensive research theory breakdown of 4-6 sentences detailing the exact scientific mechanisms, equations, or proven history for advanced exploration.",
  "subject": "The general subject name: Space & Physics, World History, Biology & Chemistry, or Math & CS",
  "mediaType": "video_simulation",
  "animationType": "orbital" or "timeline" or "reaction" or "geometry" or "dna_helix" (choose the best matching style for the visual layout),
  "quiz": {
    "question": "A conceptual, sharp multiple-choice question verifying they understood the text. Must not be a shallow trivia fact. Ask about the 'why'!",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correctAnswerIndex": 0, 1, 2, or 3 (0-based index of the correct answer),
    "explanation": "A friendly 1-2 sentence explanation of why this option is correct."
  }
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an educator specialized in making complex academic concepts viral, fun, and extremely easy to understand. Your output must strictly match the JSON schema specified. DO NOT include any emojis under any circumstances.",
        temperature: 0.85
      }
    });

    const text = response.text?.trim() || "{}";
    const cleanedText = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const data = JSON.parse(cleanedText);

    const generatedCard = {
      id: "ai_gen_" + Date.now() + "_" + Math.floor(Math.random()*1000),
      subject: data.subject || subject || "Academic Discovery",
      title: data.title || `${topic} Explained`,
      creator: data.creator || "@curio_ai",
      hashtags: data.hashtags || ["education", "curio", "mindblown"],
      backgroundNotation: data.backgroundNotation || "SCHEMATIC THEORY MECHANISM",
      content: data.content || `Fascinating insight into ${topic}! This introduces the core mechanism shaping our understanding. Check out the quiz below.`,
      detailedTheory: data.detailedTheory || `A specialized deep exploration of ${topic} teaches us the scientific rigor relative to modern physical laws. Use our Socratic Coach to investigate this further.`,
      mediaType: "video_simulation" as const,
      animationType: (data.animationType || "orbital") as any,
      quiz: {
        question: data.quiz?.question || `What is the primary factor in ${topic}?`,
        options: data.quiz?.options || ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswerIndex: typeof data.quiz?.correctAnswerIndex === 'number' ? data.quiz.correctAnswerIndex : 0,
        explanation: data.quiz?.explanation || "This option represents the core principle governing this topic."
      },
      likes: Math.floor(Math.random() * 500) + 50,
      bookmarks: Math.floor(Math.random() * 200) + 20,
      shares: Math.floor(Math.random() * 100) + 5,
      comments: [
        { id: `c_ai_g_${Date.now()}_1`, username: "curiosity_seeker", text: "Wow, I finally understand this after years of school confusion!", likes: 18, timestamp: "1m ago" },
        { id: `c_ai_g_${Date.now()}_2`, username: "Curio AI", text: `Spot on! Did you manage to solve the quiz correctly? Let me know why you chose your response!`, likes: 11, timestamp: "Just now", isAiResponse: true }
      ]
    };

    userGeneratedCards.unshift(generatedCard);
    res.json({ card: generatedCard });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: "Failed to create lesson with Gemini. Please verify your GEMINI_API_KEY is correctly set in Secrets." });
  }
});

// API for a user to comment, and gets a smart educational answer back from Curio AI (using Gemini if active, or smart rule-based educator tips)
app.post("/api/comment", async (req, res) => {
  const { cardId, username, text } = req.body;
  if (!cardId || !username || !text) {
    return res.status(400).json({ error: "Missing required comment data." });
  }

  const responseCommentId = "rc_" + Date.now();
  const userComment = {
    id: "uc_" + Date.now(),
    username: username,
    text: text,
    likes: 0,
    timestamp: "Just now"
  };

  // Find the card to context-sensitize the AI answer
  const card = [...mockCards, ...userGeneratedCards].find(c => c.id === cardId);
  const cardTopic = card ? card.title : "this topic";
  const cardContent = card ? card.content : "";

  // Generate an educational AI reply dynamically if Gemini is active
  let aiReplyText = `That's a very thoughtful point, @${username}! Keep exploring and tackling quizzes to build your educational streak.`;

  if (ai) {
    try {
      const gPrompt = `
You are "@Curio AI", an extremely friendly, expert educational coach who replies in comments.
The user is viewing a lesson titled "${cardTopic}" with content: "${cardContent}".
The user commented: "${text}".
Reply with a 1-to-2 sentence educational, encouraging response. Talk directly to user @${username}. Do NOT add any emojis or emoticons.
Do not write wrappers, just output the comment text directly.
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: gPrompt,
        config: {
          maxOutputTokens: 120,
          temperature: 0.8
        }
      });
      aiReplyText = response.text?.trim() || aiReplyText;
    } catch (e) {
      console.error("AI Comment response failed, using friendly placeholder.");
    }
  } else {
    // Basic smart educator rules
    const lowerComment = text.toLowerCase();
    if (lowerComment.includes("why") || lowerComment.includes("how") || lowerComment.includes("?")) {
      aiReplyText = `Wonderful question @${username}! Analysis of these precise mechanics reveals even deeper layers. Try prompting this specific question in the top box to generate a custom card!`;
    } else if (lowerComment.includes("cool") || lowerComment.includes("love") || lowerComment.includes("wow")) {
      aiReplyText = `It really is mind-blowing @${username}! Small shifts in our perspective make the whole universe look complete. You got this streak active!`;
    }
  }

  const aiComment = {
    id: responseCommentId,
    username: "Curio AI",
    text: aiReplyText,
    likes: Math.floor(Math.random() * 5) + 1,
    timestamp: "Just now",
    isAiResponse: true
  };

  res.json({
    userComment,
    aiComment
  });
});

// Setup Vite development server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
