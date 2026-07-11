import { Novel } from "./types";

export const DEFAULT_BADGES = [
  { id: "first_read", title: "First Step", description: "You read your first chapter on MistVil", icon: "BookOpen" },
  { id: "streak_3", title: "Fog Seeker", description: "Maintained a reading streak of 3 consecutive days", icon: "Flame" },
  { id: "all_novels", title: "Omni Explorer", description: "Read at least one chapter of every available novel", icon: "Compass" },
  { id: "bookmark_master", title: "Archivist", description: "Saved 5 bookmarks or personal reading annotations", icon: "Bookmark" },
  { id: "speed_reader", title: "Lightning Fast", description: "Read a total of 2500+ words across translated works", icon: "Zap" }
];

export const MOCK_NOVELS: Novel[] = [
  {
    id: "lord-of-misty-thrones",
    title: "Lord of the Misty Thrones",
    englishTitle: "Lord of the Misty Thrones",
    coverImage: "/src/assets/images/lord_of_misty_thrones_cover_1783795825290.jpg",
    author: "Eldridge Wylde",
    translator: "MistVil Translation Team",
    description: "In a world blanketed by an eternal black fog, ancient lineages awaken and mysterious entities vie for lost thrones. Arthur wakes up in a ruined cathedral on the outskirts of the foggy town with no memories, holding only a strange brass lantern emitting a faint green glow. This lantern grants him the power to read metaphysical glyphs left behind by ancient rulers and decode the mysteries of death in this gloomy world.",
    genres: ["Dark Fantasy", "Mystery", "Magical Secrets", "Thriller"],
    tags: ["Smart Protagonist", "Gloomy World", "Relic Tools", "Misty Magic"],
    rating: 4.8,
    chaptersCount: 3,
    status: "مستمرة",
    viewCount: 14203,
    chapters: [
      {
        id: "lmt-ch-1",
        novelId: "lord-of-misty-thrones",
        title: "Chapter 1: Awakening in the Silent Cathedral",
        chapterNumber: 1,
        publishDate: "2026-07-01",
        wordCount: 820,
        content: [
          "The frost seeped beneath his rough cloak, touching his cold skin. Arthur slowly opened his eyes, greeted by a deep darkness broken only by faint streams of light filtering through the stained glass windows of the ruined cathedral.",
          "In his right hand, he felt a familiar metallic weight. He was holding a strange lantern, pulsing with a faint ember of green light. This light did not merely illuminate the space; it seemed to actively repel the fog creeping through the cracks of the ancient wooden door.",
          "Arthur stood, leaning against the church altar. A terrible void occupied his mind; no name, no past, no purpose. Only a single thought clung to his consciousness as if branded by hot iron: 'Never let the green light go out, or the abyssal fog will swallow you whole.'",
          "Suddenly, metaphysical glyphs began to glow on the cathedral walls, shining with the same hue as the lantern. Arthur drew closer, and instinctively, his vision opened to comprehend their hidden, terrifying meaning: 'The Lost King shall return when the first sea of fog dries up.'"
        ],
        translatorNotes: "Translator Note: The Silent Cathedral refers in English folklore to the 'Silentium' chapel abandoned after the great cataclysm. The mysterious tone was preserved to keep the user immersed in the protagonist's confusion.",
        translationNotesMap: {
          1: "The author uses 'green light' to refer to the 'Aether Catalyst spark', a concept that will repeat heavily in future chapters.",
          3: "The metaphysical glyphs here are translated from 'Metaphysical Glyphs', a magical language used by the ancient 'Arcane' race to cast defensive barriers."
        },
        termsMap: {
          "metaphysical glyphs": {
            translation: "Metaphysical Glyphs",
            explanation: "An ancient language of magical symbols used to document ancient spells and covenants, readable only by those with soul-sight or relic tools."
          },
          "abyssal fog": {
            translation: "The Abyss Mist",
            explanation: "A mysterious magical weather phenomenon covering the continent of 'Andaria', carrying distorted monsters inside and draining the sanity of any living creature entering unprotected."
          }
        }
      },
      {
        id: "lmt-ch-2",
        novelId: "lord-of-misty-thrones",
        title: "Chapter 2: The Green Lantern and the Three Covenants",
        chapterNumber: 2,
        publishDate: "2026-07-04",
        wordCount: 950,
        content: [
          "Arthur stepped outside the boundaries of the ruined cathedral. The howling wind was gloomy, and the external fog appeared thicker and more viscous, like a living creature trying to feel his limbs, searching for any opening to swallow him.",
          "He lifted the brass lantern slightly. The protective green light expanded, forcing the wall of fog to recede by five full paces around him. In this tight, safe space, Arthur felt a warmth restoring vitality to his stiffened body.",
          "On the damp, earthy ground, he noticed deep, massive non-human footprints heading toward the forest surrounding the dead town. Remembering the glyphs he had just read, he wondered if the Lost King was the one who left these tracks.",
          "Invisible voices whispered from the heart of the darkness: 'O new bearer... Are you ready to offer the first sacrifice?' Arthur felt a heavy spiritual pressure, like a mountain, clamping down on his chest, making him realize the lantern is not just a tool of survival, but a shackle binding him to inescapable soul covenants."
        ],
        translatorNotes: "Translator Note: The dialogue of the hidden voices is written in a poetic and mysterious style in the original, which we translated to reflect fear and mystery to ensure an exciting experience.",
        translationNotesMap: {
          1: "The distance of 'five paces' in ancient lore symbolizes the 'minimum spiritual protection domain' for ninth-grade mages.",
          3: "The concept of 'First Sacrifice' is a common mechanic in dark fantasy novels to activate holy relic tools."
        },
        termsMap: {
          "first sacrifice": {
            translation: "The First Sacrifice",
            explanation: "A spiritual activation process requiring the lantern bearer to offer part of their memories or soul-blood to expand the light domain and obtain defensive combat skills."
          },
          "soul covenants": {
            translation: "Soul Covenants",
            explanation: "Unbreakable contractual bonds formed between a mage and relic items, where the relic grants immense power in exchange for strict, life-threatening conditions."
          }
        }
      },
      {
        id: "lmt-ch-3",
        novelId: "lord-of-misty-thrones",
        title: "Chapter 3: A Visitor in the Dusty Night",
        chapterNumber: 3,
        publishDate: "2026-07-08",
        wordCount: 1100,
        content: [
          "Arthur took refuge in an abandoned wooden cabin containing the remains of a stone fireplace, cold for a long time. He placed the lantern on a dilapidated wooden table and watched its stable green pulses. The fog outside seemed to have settled temporarily.",
          "As he tried to gather his thoughts, the cabin window was tapped gently. Three slow taps, followed by a single strong knock. The blood froze in Arthur's veins, for in this misty wasteland, no living being should wander without a specialized lantern.",
          "From behind the dusty glass, emerged the face of a girl wearing a silver mask engraved with a single-eye symbol. Her eyes were not visible, but the green light of Arthur's lantern reflected on her mask to reveal ancient writing: 'Mist Wardens'.",
          "The girl opened the door without waiting for permission, and said in a calm but commanding tone: 'Extinguish your lantern immediately, stranger. They are searching for the Emerald Spark, and if they find you here... not even ashes will remain of your soul.'"
        ],
        translatorNotes: "Translator Note: 'Mist Wardens' are an ancient combat class that will play a pivotal role in helping or destroying the protagonist. The single-eye mask indicates their loyalty to the temple of the 'Eternal Soul Eye'.",
        translationNotesMap: {
          2: "The single-eye symbol in the folklore of the misty lands represents the pursuit of absolute truth through sacrificing physical sight.",
          3: "The 'Emerald Spark' is the secret name enemies use to refer to Arthur's relic lantern."
        },
        termsMap: {
          "mist wardens": {
            translation: "Mist Wardens",
            explanation: "A mysterious sect of warriors who developed special skills to live and fight inside the thick fog without needing aether lanterns, aiming to maintain the balance of the magical world."
          }
        }
      }
    ]
  },
  {
    id: "immortal-sword-path",
    title: "Path of the Immortal Sword",
    englishTitle: "Path of the Immortal Sword",
    coverImage: "/src/assets/images/immortal_sword_path_cover_1783795838466.jpg",
    author: "Zhang Wei",
    translator: "Abu Omar (Sword Ether)",
    description: "An epic Chinese cultivation (Xianxia) novel. Ling Chen was born in the Heavenly Sword Sect with broken meridians, a desperate state that dooms him to eternal failure as a weak mortal. However, after being betrayed and thrown into the 'Abyss of Fallen Swords', he finds a lost ancient scroll teaching him to cultivate his soul sword by refining Qi directly inside his soul instead of physical meridians. From here begins his path to slice through the Seven Heavens and challenge the Immortals with only a single sword.",
    genres: ["Xianxia", "Martial Arts", "Action", "Hype"],
    tags: ["Betrayed Protagonist", "Weak to Strong", "Revenge", "Sword Sect"],
    rating: 4.9,
    chaptersCount: 3,
    status: "مستمرة",
    viewCount: 28940,
    chapters: [
      {
        id: "isp-ch-1",
        novelId: "immortal-sword-path",
        title: "Chapter 1: Broken Meridians and the Abyssal Chasm",
        chapterNumber: 1,
        publishDate: "2026-07-02",
        wordCount: 890,
        content: [
          "Ling Chen stood on the edge of the Abyss of Fallen Swords, blood dripping heavily from his left shoulder. His fellow disciples, whom he once considered family, looked at him with cold eyes filled with contempt and schadenfreude.",
          "Xing Huan, the sect's first genius, held a sword dripping with blood and said: 'Ling Chen, with your broken meridians, you are nothing more than trash polluting the name of the Heavenly Sword Sect. Your death today is a service to divine justice!'",
          "With a final effort, Ling Chen spat blood from his mouth and laughed a desperate, mocking laugh. He knew his only sin was not weakness, but finding the 'Ancient Sword Heart Stone' that the greedy Xing family had long coveted.",
          "Before Xing Huan's hand could reach out to tear the stone from his necklace, Ling Chen took a step back and threw himself into the thick, stagnant fog of the terrifying abyss, leaving behind shouts of rage and disappointment."
        ],
        translatorNotes: "Translator Note: 'Abyss of Fallen Swords' is a historically forbidden area in the cultivation world where thousands of spiritual swords were buried after the great deity war. Traditional Xianxia terminology was maintained to highlight the authentic flavor.",
        translationNotesMap: {
          1: "Broken Meridians 'Broken Meridians/Jingmai' refers in Chinese novels to the blockage or tearing of Qi channels, making energy storage in the Dantian impossible.",
          3: "The Abyss of Fallen Swords represents a rich spiritual geographical site with raging sword intent 'Sword Qi' that shreds ordinary bodies."
        },
        termsMap: {
          "broken meridians": {
            translation: "Broken Meridians / Jingmai",
            explanation: "A rare physical condition in which a person is unable to circulate Qi through their body channels, preventing them from practicing martial arts and ascending in spiritual training."
          },
          "heavenly sword sect": {
            translation: "Heavenly Sword Sect",
            explanation: "One of the five major martial sects in the Eastern Spiritual Continent, famous for training powerful sword cultivators and teaching 'Nine Rages Sword'."
          }
        }
      },
      {
        id: "isp-ch-2",
        novelId: "immortal-sword-path",
        title: "Chapter 2: Mortal Sword Refining Art",
        chapterNumber: 2,
        publishDate: "2026-07-05",
        wordCount: 1020,
        content: [
          "Ling Chen woke up on a carpet of rusted, broken swords. To his surprise, his body was not completely destroyed; instead, the Sword Heart Stone necklace emitted a milky warmth seeping directly into his soul and body, healing his deep wounds.",
          "When he focused his consciousness, glowing golden scriptures appeared in his mind, as if engraved directly on his soul: 'Mortal Sword Refining Art: If physical meridians are broken, let the soul be your scabbard, and make Qi your immortal sword!'",
          "This technique called for shattering the traditional concept of cultivation. Instead of gathering energy from heaven and earth in the physical Dantian, it proposed transforming the soul itself into a refined sword core capable of filtering cosmic energy directly.",
          "Ling Chen sat in a meditative posture, ignoring the burning pains ravaging his body. He began to summon the scattered Qi energy around him, directing it straight to his heart to merge with the relic Sword Heart Stone, declaring the start of his unique, supernatural path of cultivation."
        ],
        translatorNotes: "Translator Note: The 'Dantian' is the spiritual energy center located three fingers below the navel in Chinese mythology and traditional medicine. We simplified the explanation to ensure smooth understanding for readers.",
        translationNotesMap: {
          1: "Mortal Sword Refining Art is considered a forbidden technique because it requires an iron will and leads to instant death if the practitioner fails.",
          3: "Qi is the vital cosmic energy that all immortals rely on to increase their power and prolong their lives."
        },
        termsMap: {
          "qi": {
            translation: "Qi / Chi",
            explanation: "The vital spiritual energy that fills the universe. Cultivators absorb and refine it inside their bodies to strengthen bones, minds, and achieve immortality."
          },
          "dantian": {
            translation: "Dantian",
            explanation: "The spiritual energy core or reservoir in a martial artist's body, used to store refined Qi."
          }
        }
      },
      {
        id: "isp-ch-3",
        novelId: "immortal-sword-path",
        title: "Chapter 3: First Stage of Sword Intent",
        chapterNumber: 3,
        publishDate: "2026-07-09",
        wordCount: 1200,
        content: [
          "Three weeks passed and Ling Chen had not left the abyss. His mortal skin turned into a faint grey metallic luster, and his eyes seemed sharper and deeper, as if a single glance could penetrate dense iron armor.",
          "In his palm, he held a dusty wooden sword he picked up from the ground. Yet, with a gentle wave, a slight booming sound echoed in the air, and nearby solid rocks cracked, leaving sharp, straight scars.",
          "He had finally succeeded in refining the first stage of 'Soul Sword Intent', a step that the genius Xing Huan only reached after five years of arduous training backed by the finest Qi condensation pills.",
          "Ling Chen looked up toward the peak of the abyss where the Heavenly Sword Sect hid behind bright clouds, and muttered coldly: 'Xing Huan, Heavenly Sword Sect... wait for me, I will return soon to reclaim what is mine and slice through your hypocrisy completely!'"
        ],
        translatorNotes: "Translator Note: 'Sword Intent' (Jianyi) is a very high level of martial comprehension where a fighter embodies their martial will as sharp energy that pierces any physical defense.",
        translationNotesMap: {
          1: "The grey metallic luster symbolizes entry into the 'Mortal Iron Body' level, a rare physical transformation for cultivators.",
          2: "Qi Condensation Pills are spiritual alchemical capsules crafted from rare mountain herbs to accelerate the accumulation of spiritual energy."
        },
        termsMap: {
          "sword intent": {
            translation: "Sword Intent / Jianyi",
            explanation: "A spiritual martial concept representing the fusion of the swordsman's mind with their combat spirit, allowing them to launch sharp, devastating attacks even using a tree branch or a broken sword."
          }
        }
      }
    ]
  },
  {
    id: "lost-eras-mechanic",
    title: "Mechanic of the Lost Eras",
    englishTitle: "Mechanic of the Lost Eras",
    coverImage: "/src/assets/images/lost_eras_mechanic_cover_1783795852401.jpg",
    author: "Alister Gray",
    translator: "Digital Luna",
    description: "In an era where steam blends with magical gears, the 'Brass Empire' dominates the world with its massive war machines. Edward lives as a simple mechanic in the slums, repairing antique clocks and damaged steam pieces. His life turns upside down when a dilapidated mechanical model from the 'Lost Eras' falls into his hands containing an 'Intelligent Aether Core'. This core grants him an interactive interface capable of analyzing machinery, revealing structural defects, and inventing superhuman mechanical designs thousands of years ahead of his current age.",
    genres: ["Steampunk", "Sci-Fi", "Adventure", "Magical Machinery"],
    tags: ["Genius Protagonist", "Ancient Tech", "Machinery Crafting", "UI Interface"],
    rating: 4.7,
    chaptersCount: 3,
    status: "مستمرة",
    viewCount: 9450,
    chapters: [
      {
        id: "lem-ch-1",
        novelId: "lost-eras-mechanic",
        title: "Chapter 1: The Rusted Pocket Watch and the Blue Core",
        chapterNumber: 1,
        publishDate: "2026-07-03",
        wordCount: 850,
        content: [
          "Edward's workshop smelled of motor oil and burning coal steam. He sat behind his table littered with hundreds of brass screws and springs, trying to repair a miniature steam engine belonging to a wealthy resident of the Upper City.",
          "He wiped sweat from his forehead with his hand stained with black grease, then sighed as he looked at an old wooden box brought to him by an antiquarian from the ruins of the destroyed 'Silent Clockwork City'.",
          "Opening the box carefully, he found no gold or jewels, but a massive bronze pocket watch covered in thick rust. In its center, a dark blue crystal pulsed with a faint glow resembling rapid heartbeats.",
          "The moment his fingers touched the crystal, a blue electric spark coursed through his veins like fire, and a soft mechanical voice echoed in his mind: 'Compatible mechanic detected for ancient cipher... Aether Core system activated successfully!'"
        ],
        translatorNotes: "Translator Note: 'Steampunk' refers to a science fiction subgenre that merges 19th-century steam technology with fantasy and magical elements. We translated the mechanical descriptions precisely to convey the workshop's texture.",
        translationNotesMap: {
          1: "The Silent Clockwork City is an archaeological site destroyed in the Great War 3000 years ago, considered the origin of lost technology.",
          3: "The Aether Core in the steampunk world is the magical equivalent of nuclear reactors or super-high-capacity batteries."
        },
        termsMap: {
          "aether core": {
            translation: "Aether Core",
            explanation: "An intense ancient energy source relying on magically charged 'Aether' gas fluid to power complex old machinery and breathe life into automatic mechanical constructs."
          },
          "ancient cipher": {
            translation: "Ancient Cipher Code",
            explanation: "A digital programming language used by engineers in the lost eras to encrypt and protect their military technological designs from theft."
          }
        }
      },
      {
        id: "lem-ch-2",
        novelId: "lost-eras-mechanic",
        title: "Chapter 2: Slum 3D Analysis",
        chapterNumber: 2,
        publishDate: "2026-07-06",
        wordCount: 970,
        content: [
          "Edward blinked several times trying to get rid of the strange vision overlaying his normal sight. There were glowing blue lines displaying 3D drawings of every mechanical piece scattered in his small workshop.",
          "When he looked at the miniature steam engine he failed to repair for hours, a transparent interactive window appeared: 'Type: Fourth-generation piston compression engine. Defects: 40% steam valve blockage and a micro-crack in the central gear.'",
          "Edward felt an indescribable amazement. He picked up his screwdriver and moved directly to the valve and gear specified in his magical vision. Within ten minutes, he repaired the defect completely, accompanied by the smooth, gentle whistle of the engine.",
          "As he contemplated his achievement, a new blue window suddenly rose in his view: 'Next Goal: Craft Simple Mechanical Arm. Required components: 3kg of pure brass, steam pressure valve, and a bit of Aether fluid.'"
        ],
        translatorNotes: "Translator Note: The protagonist's UI interface is written in a style resembling video games (RPGs) to ease reader immersion and show how superior his mechanical vision is compared to his peers.",
        translationNotesMap: {
          1: "A micro-crack cannot be seen by the naked eye even using the strongest clock lenses available in the Imperial market.",
          3: "Aether Fluid is sold in special bottles at Imperial alchemy centers for exorbitant prices, being the fuel of the magical elite."
        },
        termsMap: {
          "steam pressure valve": {
            translation: "Steam Pressure Valve",
            explanation: "A precise mechanical tool controlling gas flow and pressure inside brass cylinders to prevent explosion and provide stable mechanical thrust."
          }
        }
      },
      {
        id: "lem-ch-3",
        novelId: "lost-eras-mechanic",
        title: "Chapter 3: First Mechanical Rain",
        chapterNumber: 3,
        publishDate: "2026-07-10",
        wordCount: 1150,
        content: [
          "Edward spent two sleepless nights, the sound of his brass hammer strikes echoing through the slums. He melted brass and tightened screws with utmost precision under the guidance of the virtual 3D blueprint.",
          "Finally, he secured the last piece to his right forearm. It was a lightweight, hollow brass arm, lined with fine tubes through which shiny blue Aether fluid flowed, giving it a charming sci-fi aesthetic.",
          "As he clenched his new fist, he felt a mechanical force multiplied dozens of times. He punched a nearby stone wall gently; the rocks cracked and fell like small pebbles without him feeling any pain or shock in his real arm.",
          "Edward smiled as the system screen proudly displayed: '[Aether Slasher Arm - Mark I] crafted successfully. Physical Sync Rate: 95%. You have taken your first step to becoming a legendary engineer!'"
        ],
        translatorNotes: "Translator Note: 'Physical Sync Rate' expresses how compatible the crafted machinery is with the mechanical nerves and biological body of the engineer to ensure speed and accuracy.",
        translationNotesMap: {
          1: "The Aether Slasher Arm was designed as a tool for self-defense against underworld gangs looking for quick profits.",
          2: "A 95% sync rate is almost impossible for any modern mechanical technology in the Empire, which usually stands at only 60%."
        },
        termsMap: {
          "physical sync rate": {
            translation: "Physical Sync Rate",
            explanation: "A scientific measure in the Aether system specifying how well the mechanical piece responds to the motor signals of the brain's nerves. Higher sync makes the machinery feel lighter and more flexible."
          }
        }
      }
    ]
  }
];
