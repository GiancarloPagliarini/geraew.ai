'use client';

import {
  CircleDot,
  Eye,
  Globe,
  Hand,
  ImageIcon,
  Palette,
  PersonStanding,
  RotateCcw,
  Sparkles,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Section } from './Section';
import { useInfluencerBuilder } from '@/lib/influencer-builder-context';

// ─── CDN Base URL ─────────────────────────────────────────────────────────────

const CDN = 'https://cdn.higgsfield.ai/ai_influencer_option';
const CDN_CAT = 'https://cdn.higgsfield.ai/ai_influencer_parent_category';

// ─── Dados (ids estáveis + chave i18n) ────────────────────────────────────────

type Opt = { id: string; labelKey: string; image: string };

const CHARACTER_TYPES: readonly Opt[] = [
  { id: 'Human', labelKey: 'character.human', image: `${CDN}/977e0927-1320-426b-9de3-e3a3434dbe7a.webp` },
  { id: 'Ant', labelKey: 'character.ant', image: `${CDN}/d950aa8c-7f58-4277-9f7c-a4c0f073ae99.webp` },
  { id: 'Bee', labelKey: 'character.bee', image: `${CDN}/20b90c9f-d11f-4816-ad7d-f7f388a5a8b0.webp` },
  { id: 'Octopus', labelKey: 'character.octopus', image: `${CDN}/cf21cfdb-7f25-49b2-8554-2192046aac83.webp` },
  { id: 'Crocodile', labelKey: 'character.crocodile', image: `${CDN}/79073855-12ba-4339-85ce-dc99ecf4d14c.webp` },
  { id: 'Iguana', labelKey: 'character.iguana', image: `${CDN}/5c237648-205d-484d-80e6-baa1c71d9b17.webp` },
  { id: 'Lizard', labelKey: 'character.lizard', image: `${CDN}/039958ce-ec7c-465f-a285-935802b2525d.webp` },
  { id: 'Alien', labelKey: 'character.alien', image: `${CDN}/077efffe-f459-4dd2-a5a7-064caeca5c10.webp` },
  { id: 'Beetle', labelKey: 'character.beetle', image: `${CDN}/704f1cb5-f833-4758-9f99-ba9fe6e2ed53.webp` },
  { id: 'Reptile', labelKey: 'character.reptile', image: `${CDN}/cd38cb79-b638-43f3-b546-d31849b6fe05.webp` },
  { id: 'Amphibian', labelKey: 'character.amphibian', image: `${CDN}/d0667019-3b2f-41f6-a09c-5461a5c5b7e0.webp` },
  { id: 'Elf', labelKey: 'character.elf', image: `${CDN}/f5e66aec-8b11-48b0-904b-6c84eb07349e.webp` },
  { id: 'Mantis', labelKey: 'character.mantis', image: `${CDN}/feb723e6-fed4-4e6b-965d-38f50ac4f8d6.webp` },
];

const GENDER_TYPES: readonly Opt[] = [
  { id: 'Female', labelKey: 'gender.female', image: `${CDN}/f9fa514b-620d-433e-bd4e-eadd880de118.webp` },
  { id: 'Male', labelKey: 'gender.male', image: `${CDN}/fb91b108-27fc-4e7c-a8fd-876dc8c30ecf.webp` },
  { id: 'Trans man', labelKey: 'gender.transMan', image: `${CDN}/95002c8f-c0d6-4dec-8cac-fc7b50501600.webp` },
  { id: 'Trans woman', labelKey: 'gender.transWoman', image: `${CDN}/21fc9f46-6f1f-4aed-8f74-0ca3080c8eec.webp` },
  { id: 'Non-binary', labelKey: 'gender.nonBinary', image: `${CDN}/58a652a4-bf5e-43ca-95a8-8f9e9cef5b6b.webp` },
];

const ETHNICITY_TYPES: readonly Opt[] = [
  { id: 'African', labelKey: 'ethnicity.african', image: `${CDN}/22d1da5f-5581-4030-9a14-c8dc61c40abc.webp` },
  { id: 'Asian', labelKey: 'ethnicity.asian', image: `${CDN}/c6693caf-8a31-44c6-b9c1-120b44b940a0.webp` },
  { id: 'European', labelKey: 'ethnicity.european', image: `${CDN}/b92e05ee-79a1-4c22-ba32-400c17eb9df3.webp` },
  { id: 'Indian', labelKey: 'ethnicity.indian', image: `${CDN}/35cff943-7efb-40cd-a168-dbb1f7cdbebb.webp` },
  { id: 'Middle Eastern', labelKey: 'ethnicity.middleEastern', image: `${CDN}/0f49e0cd-7b30-4bb3-94c5-792d684a4492.webp` },
  { id: 'Mixed', labelKey: 'ethnicity.mixed', image: `${CDN}/a992a191-6c13-46e2-991d-f5219b1f5f09.webp` },
];

const SKIN_COLORS: readonly Opt[] = [
  { id: 'Morena', labelKey: 'skin.tan', image: `${CDN}/4f7118d2-a16f-4cd3-8760-9a44d301baa3.webp` },
  { id: 'Preta', labelKey: 'skin.black', image: `${CDN}/4f7118d2-a16f-4cd3-8760-9a44d301baa3.webp` },
  { id: 'Branca', labelKey: 'skin.white', image: `${CDN}/4f7118d2-a16f-4cd3-8760-9a44d301baa3.webp` },
];

const EYE_COLORS: readonly Opt[] = [
  { id: 'Black', labelKey: 'eyes.black', image: `${CDN}/cc87aaa5-568e-4485-ad17-925378e14040.webp` },
  { id: 'Purple', labelKey: 'eyes.purple', image: `${CDN}/6cb9d132-30d8-4325-83f5-10e8094e85a7.webp` },
  { id: 'Green', labelKey: 'eyes.green', image: `${CDN}/dba6cbbb-557a-4d71-b5ab-720b5791282c.webp` },
  { id: 'White', labelKey: 'eyes.white', image: `${CDN}/e6c522cd-c482-44d5-b0fd-d938ac3cdc4e.webp` },
  { id: 'Brown', labelKey: 'eyes.brown', image: `${CDN}/67ef9f67-0c21-4d78-8044-561792277b4f.webp` },
  { id: 'Black (Solid)', labelKey: 'eyes.solid', image: `${CDN}/5cbd08f7-8c6a-48c4-aa93-d796fe97b8ec.webp` },
  { id: 'White (Blind)', labelKey: 'eyes.blind', image: `${CDN}/72969f70-ed33-4f69-ae34-61df12f24dda.webp` },
  { id: 'Deep Brown', labelKey: 'eyes.deepBrown', image: `${CDN}/3bc13ca9-defe-4fea-a473-2a6e17cbc521.webp` },
  { id: 'Blue', labelKey: 'eyes.blue', image: `${CDN}/15e8f960-c44b-43ae-aafb-4fd79556c420.webp` },
  { id: 'Amber', labelKey: 'eyes.amber', image: `${CDN}/4fa90e64-f060-4407-9d1f-ed8b23723c46.webp` },
  { id: 'Red', labelKey: 'eyes.red', image: `${CDN}/0f422982-0f63-460e-a459-2a2fd48f6ee0.webp` },
  { id: 'Grey', labelKey: 'eyes.grey', image: `${CDN}/cdfa6a1f-c914-44c9-afea-0a0771feeb54.webp` },
];

const SKIN_CONDITIONS: readonly Opt[] = [
  { id: 'Vitiligo', labelKey: 'skinCondition.vitiligo', image: `${CDN}/bf0f7520-a41a-46b9-b41c-7dc030c22b8b.webp` },
  { id: 'Pigmentation', labelKey: 'skinCondition.pigmentation', image: `${CDN}/a9e6b3c8-9ab5-4fe3-8b99-5c5fbfa9665c.webp` },
  { id: 'Freckles', labelKey: 'skinCondition.freckles', image: `${CDN}/a657e9c1-02b6-4083-a058-5f78e56a77ac.webp` },
  { id: 'Birthmarks', labelKey: 'skinCondition.birthmarks', image: `${CDN}/4210a458-66a4-4850-a0ec-5ae20f2214e8.webp` },
  { id: 'Scars', labelKey: 'skinCondition.scars', image: `${CDN}/9d28dcde-2709-4fa8-8f61-8a76798b0e1f.webp` },
  { id: 'Burns', labelKey: 'skinCondition.burns', image: `${CDN}/427cee67-8074-4640-ba06-51e4a5bf7ee3.webp` },
  { id: 'Albinism', labelKey: 'skinCondition.albinism', image: `${CDN}/6069e93f-31ce-4840-8e48-c81daee56be0.webp` },
  { id: 'Cracked/dry skin', labelKey: 'skinCondition.cracked', image: `${CDN}/e0fd17ab-f4bd-4950-9fdf-691a98b021c3.webp` },
  { id: 'Wrinkled skin', labelKey: 'skinCondition.wrinkled', image: `${CDN}/26f07d76-57a7-4975-b18b-80a5fa2137c5.webp` },
];

// ─── Avançado: Rosto ──────────────────────────────────────────────────────────

const EYES_TYPES: readonly Opt[] = [
  { id: 'Human', labelKey: 'eyesType.human', image: `${CDN}/ce3bb1ff-d120-4539-8aea-51bacb9e96f9.webp` },
  { id: 'Reptile', labelKey: 'eyesType.reptile', image: `${CDN}/76b1c85d-dba3-43d6-b6b0-27f2923bdab8.webp` },
  { id: 'Mechanical', labelKey: 'eyesType.mechanical', image: `${CDN}/6d7dfd84-741d-4757-9bab-a3ff7cb28612.webp` },
];

const EYES_DETAILS: readonly Opt[] = [
  { id: 'Different colors', labelKey: 'eyesDetails.different', image: `${CDN}/199bb0e7-41e8-40af-aae7-77c0c659b260.webp` },
  { id: 'Blind eye', labelKey: 'eyesDetails.blind', image: `${CDN}/a1b256a6-45a1-4008-adff-fb0fa1b52c30.webp` },
  { id: 'Scarred eye', labelKey: 'eyesDetails.scarred', image: `${CDN}/25f40e63-e0b8-4470-aac8-b3b00465f0ac.webp` },
  { id: 'Glowing eye', labelKey: 'eyesDetails.glowing', image: `${CDN}/a6a19585-e8ae-4b5b-8334-f0f24248735d.webp` },
];

const MOUTH_TEETH: readonly Opt[] = [
  { id: 'Small mouth', labelKey: 'mouth.small', image: `${CDN}/739d39d2-acc7-44b5-82e9-4d3c7bd8a1cc.webp` },
  { id: 'Large mouth', labelKey: 'mouth.large', image: `${CDN}/1baa22a5-87fe-49ce-8094-a35669ae367a.webp` },
  { id: 'No teeth', labelKey: 'mouth.noTeeth', image: `${CDN}/dad0081e-4011-4420-9a95-6a9b96e5c8d9.webp` },
  { id: 'Different teeth', labelKey: 'mouth.different', image: `${CDN}/517e33c9-82ff-4de3-9d38-8205b26e0985.webp` },
  { id: 'Sharp teeth', labelKey: 'mouth.sharp', image: `${CDN}/d44ff654-3b53-4f44-bf54-1c8d0d5c4291.webp` },
  { id: 'Forked tongue', labelKey: 'mouth.forked', image: `${CDN}/adb9bb83-1db6-41cc-9933-bae88b72739d.webp` },
  { id: 'Two tongues', labelKey: 'mouth.two', image: `${CDN}/43aeb851-4c2e-4c3b-b556-21b425eefc75.webp` },
];

const EARS_OPTIONS: readonly Opt[] = [
  { id: 'Human', labelKey: 'ears.human', image: `${CDN}/d7a9fd58-5eb3-4e3f-ad56-67bbf3655463.webp` },
  { id: 'Elf', labelKey: 'ears.elf', image: `${CDN}/e9b3d421-6cfb-41f9-af4a-fc3649238b91.webp` },
  { id: 'No Ears', labelKey: 'ears.none', image: `${CDN}/562abb29-5f61-4485-83e5-470797a8e591.webp` },
  { id: 'Wing Ears', labelKey: 'ears.wing', image: `${CDN}/9e2c4603-d683-427a-80c0-18332a0f564b.webp` },
];

const HORNS_OPTIONS: readonly Opt[] = [
  { id: 'Small Horns', labelKey: 'horns.small', image: `${CDN}/9664d380-e818-418e-a42d-f5bf4f1dc19a.webp` },
  { id: 'Big Horns', labelKey: 'horns.big', image: `${CDN}/4a4792eb-215a-4d78-b294-3f0e6bd54c04.webp` },
  { id: 'Antlers', labelKey: 'horns.antlers', image: `${CDN}/a7c647b3-c37b-4ecb-a61f-52442e1cad89.webp` },
];

const FACE_SKIN_MATERIAL: readonly Opt[] = [
  { id: 'Human skin', labelKey: 'faceSkin.human', image: `${CDN}/34d672df-7b82-4b08-b298-4e484ee2d8a2.webp` },
  { id: 'Scales', labelKey: 'faceSkin.scales', image: `${CDN}/dfb106df-8549-4758-a9fe-d405f956dc13.webp` },
  { id: 'Fur', labelKey: 'faceSkin.fur', image: `${CDN}/b041790f-27b1-491e-900a-df7b44b0c0c3.webp` },
  { id: 'Amphibian skin', labelKey: 'faceSkin.amphibian', image: `${CDN}/e471f0b4-7a41-4999-bc8d-9f9f6e030e4c.webp` },
  { id: 'Fish skin', labelKey: 'faceSkin.fish', image: `${CDN}/a349307d-dad9-4e4d-98ec-cd84094067a7.webp` },
  { id: 'Metallic', labelKey: 'faceSkin.metallic', image: `${CDN}/cde0fbeb-0556-4881-9e9e-1d4c5a5cf067.webp` },
];

const SURFACE_PATTERNS: readonly Opt[] = [
  { id: 'Solid', labelKey: 'surface.solid', image: `${CDN}/9d344ce6-aecf-4d44-9969-485a6cdbb4c1.webp` },
  { id: 'Stripes', labelKey: 'surface.stripes', image: `${CDN}/979e4934-dbef-4fbe-be38-f3579f2cc78e.webp` },
  { id: 'Spots', labelKey: 'surface.spots', image: `${CDN}/7b92c3aa-b271-4e8b-b5ee-331ec8fc3da7.webp` },
  { id: 'Chess', labelKey: 'surface.chess', image: `${CDN}/b956ae69-56df-40a3-baf9-f879ce1292f1.webp` },
  { id: 'Veins', labelKey: 'surface.veins', image: `${CDN}/14aa0526-5be3-4a2b-a172-3c6af54b4d36.webp` },
  { id: 'Giraffe', labelKey: 'surface.giraffe', image: `${CDN}/e45c30a6-8b55-40df-a85c-ba06a86273af.webp` },
  { id: 'Cowhide', labelKey: 'surface.cowhide', image: `${CDN}/0fd77971-2a7f-45f2-af99-1db26bf6339e.webp` },
];

// ─── Avançado: Corpo ──────────────────────────────────────────────────────────

const BODY_TYPES: readonly Opt[] = [
  { id: 'Slim', labelKey: 'body.slim', image: `${CDN}/dadf681a-d007-4ac7-96f0-cb14673687b5.webp` },
  { id: 'Lean', labelKey: 'body.lean', image: `${CDN}/142ea702-6816-4933-8f42-4b65cade3a8c.webp` },
  { id: 'Athletic', labelKey: 'body.athletic', image: `${CDN}/d077688b-6a9a-4cb5-9bfb-b62c06fc7f2b.webp` },
  { id: 'Muscular', labelKey: 'body.muscular', image: `${CDN}/16b7cb85-e2b6-42ac-8d22-30edb28d8eb2.webp` },
  { id: 'Curvy', labelKey: 'body.curvy', image: `${CDN}/2bb2fe58-8099-4d62-97f5-5742e564a31f.webp` },
  { id: 'Heavy', labelKey: 'body.heavy', image: `${CDN}/c6198edf-f21d-4e3e-9ac5-d4a3333ceb6f.webp` },
  { id: 'Skinny', labelKey: 'body.skinny', image: `${CDN}/b8109486-db80-4bef-b2c6-3f823cde5eb7.webp` },
];

const LEFT_ARM_OPTIONS: readonly Opt[] = [
  { id: 'Normal arm', labelKey: 'limbs.normal', image: `${CDN}/d8b70b8b-07fe-4056-b654-40144f0abf13.webp` },
  { id: 'Cute arm', labelKey: 'limbs.cute', image: `${CDN}/2896f074-69bb-4ac7-be86-7203c33ac5b6.webp` },
  { id: 'Robotic arm', labelKey: 'limbs.robotic', image: `${CDN}/f168d95a-5744-46d7-ac2f-039a0e7d78ff.webp` },
  { id: 'Prosthetic arm', labelKey: 'limbs.prosthetic', image: `${CDN}/da1534dc-1166-44e6-8f38-8c7d5f172fa8.webp` },
  { id: 'Mechanical arm', labelKey: 'limbs.mechanical', image: `${CDN}/335cc7d7-a1bc-45d0-9d35-f897c081d60b.webp` },
  { id: 'None', labelKey: 'limbs.none', image: `${CDN}/a9c17f68-ee40-450b-9f82-4cce5b7d4ccc.webp` },
];

const RIGHT_ARM_OPTIONS: readonly Opt[] = [
  { id: 'Normal arm', labelKey: 'limbs.normal', image: `${CDN}/030fe9e3-b4b6-490b-a1fa-163680682b89.webp` },
  { id: 'Cute arm', labelKey: 'limbs.cute', image: `${CDN}/259eac0d-f054-4b09-9101-f09934d07663.webp` },
  { id: 'Robotic arm', labelKey: 'limbs.robotic', image: `${CDN}/1e0fdb91-e757-419e-9f40-250b084904cc.webp` },
  { id: 'Prosthetic arm', labelKey: 'limbs.prosthetic', image: `${CDN}/d1db6a3f-cbfd-43f8-97ab-002341774488.webp` },
  { id: 'Mechanical arm', labelKey: 'limbs.mechanical', image: `${CDN}/4bcab738-e4b9-4831-9612-c3263ce9cbae.webp` },
  { id: 'None', labelKey: 'limbs.none', image: `${CDN}/764b52a2-006b-46e0-a649-5c71e8cd9915.webp` },
];

const LEFT_LEG_OPTIONS: readonly Opt[] = [
  { id: 'Normal leg', labelKey: 'limbs.normal', image: `${CDN}/eb416e7d-63c5-40df-86a9-6787c5784ef5.webp` },
  { id: 'Cute leg', labelKey: 'limbs.cute', image: `${CDN}/5d927e55-999a-4319-90de-4723bed162fb.webp` },
  { id: 'Robotic leg', labelKey: 'limbs.robotic', image: `${CDN}/1daebe83-c57e-4594-b6e0-f35b1608fbdd.webp` },
  { id: 'Prosthetic leg', labelKey: 'limbs.prosthetic', image: `${CDN}/d7e4fbd7-4eed-497d-b627-9b50adc1d1fd.webp` },
  { id: 'Mechanical leg', labelKey: 'limbs.mechanical', image: `${CDN}/a709b1c0-7f65-42dd-b24c-a81f3ca4d666.webp` },
  { id: 'None', labelKey: 'limbs.none', image: `${CDN}/2137532d-0b3b-4c60-8930-f608135c73c2.webp` },
];

const RIGHT_LEG_OPTIONS: readonly Opt[] = [
  { id: 'Normal leg', labelKey: 'limbs.normal', image: `${CDN}/61905af5-e21a-48d9-90ad-b87d47d6858b.webp` },
  { id: 'Cute leg', labelKey: 'limbs.cute', image: `${CDN}/4d22f534-f865-49a4-9327-dfd082b0fb79.webp` },
  { id: 'Robotic leg', labelKey: 'limbs.robotic', image: `${CDN}/475314c9-5b3e-4c60-a14d-fffda3c5c852.webp` },
  { id: 'Prosthetic leg', labelKey: 'limbs.prosthetic', image: `${CDN}/9d2bda1f-bd7e-4acb-9c17-87e8528efa1d.webp` },
  { id: 'Mechanical leg', labelKey: 'limbs.mechanical', image: `${CDN}/e8e31345-3d33-4608-ab56-87ce4d185d77.webp` },
  { id: 'None', labelKey: 'limbs.none', image: `${CDN}/5b3674c7-0c91-4af4-b9c2-e0c352466c01.webp` },
];

// ─── Avançado: Estilo ─────────────────────────────────────────────────────────

const HAIR_OPTIONS: readonly Opt[] = [
  { id: 'Bald', labelKey: 'hair.bald', image: `${CDN}/ca8b2954-900c-424f-9fda-acc5c37d58dd.webp` },
  { id: 'Short hair', labelKey: 'hair.short', image: `${CDN}/383399be-fe36-4196-9b45-f328cf40eb1e.webp` },
  { id: 'Long hair', labelKey: 'hair.long', image: `${CDN}/9145dee8-7136-4ee9-a464-20268fed4a37.webp` },
  { id: 'Afro', labelKey: 'hair.afro', image: `${CDN}/7fc8fcc7-310f-406c-94c2-c4fc56568d40.webp` },
  { id: 'Punk hairstyle', labelKey: 'hair.punk', image: `${CDN}/a6555ba9-bd9b-4839-898d-3758e9788d18.webp` },
  { id: 'Fur', labelKey: 'hair.fur', image: `${CDN}/1de2b775-27ed-4465-a930-f8cb2d73bd9f.webp` },
  { id: 'Tentacles', labelKey: 'hair.tentacles', image: `${CDN}/b3c8c28b-c19d-49bf-8223-42a5e3a66edb.webp` },
  { id: 'Spines', labelKey: 'hair.spines', image: `${CDN}/35fd3acc-eda0-4b00-a19a-32ad85ce7766.webp` },
];

const HAIR_COLORS: ReadonlyArray<{ id: string; labelKey: string }> = [
  { id: 'Black', labelKey: 'hairColor.black' },
  { id: 'Dark Brown', labelKey: 'hairColor.darkBrown' },
  { id: 'Brown', labelKey: 'hairColor.brown' },
  { id: 'Light Brown', labelKey: 'hairColor.lightBrown' },
  { id: 'Blonde', labelKey: 'hairColor.blonde' },
  { id: 'Platinum Blonde', labelKey: 'hairColor.platinumBlonde' },
  { id: 'Red', labelKey: 'hairColor.red' },
  { id: 'Ginger', labelKey: 'hairColor.ginger' },
  { id: 'Auburn', labelKey: 'hairColor.auburn' },
  { id: 'Grey', labelKey: 'hairColor.grey' },
  { id: 'White', labelKey: 'hairColor.white' },
  { id: 'Blue', labelKey: 'hairColor.blue' },
  { id: 'Pink', labelKey: 'hairColor.pink' },
  { id: 'Purple', labelKey: 'hairColor.purple' },
  { id: 'Green', labelKey: 'hairColor.green' },
  { id: 'Ombre', labelKey: 'hairColor.ombre' },
  { id: 'Highlights', labelKey: 'hairColor.highlights' },
];

const ACCESSORIES_OPTIONS: readonly Opt[] = [
  { id: 'Tattoos', labelKey: 'accessories.tattoos', image: `${CDN}/2c4a9764-5449-4c78-a5c1-d6b13034d222.webp` },
  { id: 'Piercing', labelKey: 'accessories.piercing', image: `${CDN}/587f72de-6688-441a-8696-77bd251fa138.webp` },
  { id: 'Scarification', labelKey: 'accessories.scarification', image: `${CDN}/855ceb60-0637-4266-909b-2713bb459da7.webp` },
  { id: 'Symbols', labelKey: 'accessories.symbols', image: `${CDN}/3bdb0c00-765a-4405-b037-bd064c39309c.webp` },
  { id: 'Cyber markings', labelKey: 'accessories.cyber', image: `${CDN}/123f2efe-cd4b-42a9-89e7-db1a49ebf089.webp` },
];

const ADVANCED_TABS = [
  { id: 'face' as const, labelKey: 'tabs.face', image: `${CDN_CAT}/e0805c7f-c1b0-4c68-bbc7-bab5ae86d6df.webp` },
  { id: 'body' as const, labelKey: 'tabs.body', image: `${CDN_CAT}/ee30f691-5d7b-4788-af82-73d86b6f32bb.webp` },
  { id: 'style' as const, labelKey: 'tabs.style', image: `${CDN_CAT}/5b67892f-ef65-4f8d-af20-e0f35a13f1b3.webp` },
];

// ─── Age / Rendering options (id estável, label traduzida) ────────────────────

const AGE_OPTIONS = [
  { id: 'Adolescente', labelKey: 'ageOptions.teen' },
  { id: 'Jovem adulto', labelKey: 'ageOptions.youngAdult' },
  { id: 'Adulto', labelKey: 'ageOptions.adult' },
  { id: 'Meia-idade', labelKey: 'ageOptions.middleAge' },
  { id: 'Idoso', labelKey: 'ageOptions.senior' },
];

const RENDERING_OPTIONS = [
  { id: 'Hiper-realista', labelKey: 'renderingOptions.hyperrealistic' },
  { id: 'Anime', labelKey: 'renderingOptions.anime' },
  { id: 'Cartoon', labelKey: 'renderingOptions.cartoon' },
  { id: 'Ilustração 2D', labelKey: 'renderingOptions.illustration2d' },
];

// ─── ImageOptionGrid ──────────────────────────────────────────────────────────

function ImageOptionGrid({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ReadonlyArray<Opt>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('editorChrome.influencer');
  return (
    <div className={`grid grid-cols-3 gap-2 mt-2 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      {options.map((opt) => {
        const active = value === opt.id;
        const label = t(opt.labelKey);
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            disabled={disabled}
            className="group relative aspect-square overflow-hidden rounded-xl transition-all active:scale-95"
            style={{
              border: `2px solid ${active ? 'rgba(162,221,0,0.6)' : 'rgba(243,240,237,0.06)'}`,
              boxShadow: active ? '0 0 12px rgba(162,221,0,0.15)' : 'none',
            }}
          >
            <Image
              src={opt.image}
              alt={label}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="120px"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            <span className="absolute bottom-1.5 left-2 text-[11px] font-bold text-white drop-shadow-md">
              {label}
            </span>

            {active && (
              <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#a2dd00] shadow-md">
                <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── OptionPills ──────────────────────────────────────────────────────────────

function OptionPills({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ReadonlyArray<{ id: string; labelKey: string }>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('editorChrome.influencer');
  return (
    <div className={`flex flex-wrap gap-1.5 mt-2 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            disabled={disabled}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all active:scale-95"
            style={{
              background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
              color: active ? '#a2dd00' : 'rgba(243,240,237,0.4)',
              border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
            }}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

// ─── AdvancedTabCard ──────────────────────────────────────────────────────────

function AdvancedTabCard({
  image,
  label,
  active,
  onClick,
}: {
  image: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-1 flex-col items-center gap-2 overflow-hidden rounded-xl p-3 transition-all active:scale-95"
      style={{
        border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
      }}
    >
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={label}
          fill
          className="object-cover opacity-30 transition-opacity group-hover:opacity-40"
          sizes="120px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/40" />
      </div>
      <span
        className="relative z-10 mt-4 text-[9px] font-bold tracking-wider"
        style={{ color: active ? '#a2dd00' : 'rgba(243,240,237,0.5)' }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── InfluencerSidebar ────────────────────────────────────────────────────────

export function InfluencerSidebar() {
  const t = useTranslations('editorChrome.influencer');
  const tSections = useTranslations('editorChrome.influencer.sections');
  const { selections, set, reset, prompt, referenceImage, setReferenceImage } = useInfluencerBuilder();
  const [tab, setTab] = useState<'builder' | 'prompt'>('builder');
  const [advancedTab, setAdvancedTab] = useState<'face' | 'body' | 'style'>('face');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasReference = !!referenceImage;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = file.type === 'image/webp' ? 'image/png' : file.type;
      setReferenceImage({
        base64,
        mimeType,
        preview: URL.createObjectURL(file),
      });
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  }, [setReferenceImage]);

  const handleRemoveReference = useCallback(() => {
    setReferenceImage(null);
  }, [setReferenceImage]);

  const advancedTabsLocalized = useMemo(
    () => ADVANCED_TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) })),
    [t],
  );

  return (
    <>
      {/* Abas + Resetar */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] px-4 py-3">
        <div className="flex gap-1 rounded-lg bg-[#f3f0ed]/[0.04] p-0.5">
          <button
            onClick={() => setTab('builder')}
            className="rounded-md px-3 py-1.5 text-[10px] font-bold tracking-wider transition-all"
            style={{
              background: tab === 'builder' ? 'rgba(162,221,0,0.12)' : 'transparent',
              color: tab === 'builder' ? '#a2dd00' : 'rgba(243,240,237,0.35)',
            }}
          >
            {t('tabBuilder')}
          </button>
          <button
            onClick={() => setTab('prompt')}
            className="rounded-md px-3 py-1.5 text-[10px] font-bold tracking-wider transition-all"
            style={{
              background: tab === 'prompt' ? 'rgba(162,221,0,0.12)' : 'transparent',
              color: tab === 'prompt' ? '#a2dd00' : 'rgba(243,240,237,0.35)',
            }}
          >
            {t('tabPrompt')}
          </button>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#f3f0ed]/30 transition-colors hover:text-[#f3f0ed]/60"
        >
          <RotateCcw className="h-3 w-3" />
          {t('reset')}
        </button>
      </div>

      {/* Área de conteúdo */}
      <div className="sidebar-scroll flex-1 overflow-y-auto">
        {tab === 'prompt' ? (
          <div className="p-4 space-y-2">
            <p className="text-[10px] font-bold tracking-[0.1em] text-[#f3f0ed]/40">
              {t('promptTitle')}
            </p>
            <textarea
              rows={10}
              readOnly
              value={prompt}
              className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-xs leading-relaxed text-[#f3f0ed]/70 placeholder-[#f3f0ed]/25 outline-none"
            />
            <p className="text-[9px] text-[#f3f0ed]/20">
              {t('promptHint')}
            </p>
          </div>
        ) : (
          <>
            {/* ── Imagem de Referência ─────────────────────────────────── */}
            <div className="border-b border-[#f3f0ed]/[0.05] px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10">
                  <Upload className="h-3.5 w-3.5 text-[#a2dd00]" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/55">
                  {t('referenceTitle')}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />

              {hasReference ? (
                <div className="relative overflow-hidden rounded-xl border border-[#a2dd00]/20">
                  <img
                    src={referenceImage.preview}
                    alt={t('referenceAlt')}
                    className="w-full max-h-48 object-cover"
                  />
                  <button
                    onClick={handleRemoveReference}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#f3f0ed]/70 transition-all hover:bg-black/80 hover:text-[#f3f0ed]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                    <p className="text-[10px] font-semibold text-[#a2dd00]">
                      {t('referenceActive')}
                    </p>
                    <p className="text-[9px] text-[#f3f0ed]/40">
                      {t('referenceDisabledHint')}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/10 bg-[#1e494b]/10 px-4 py-6 transition-all hover:border-[#a2dd00]/20 hover:bg-[#1e494b]/20"
                >
                  <Upload className="h-5 w-5 text-[#f3f0ed]/25" />
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-[#f3f0ed]/50">
                      {t('uploadTitle')}
                    </p>
                    <p className="mt-0.5 text-[9px] text-[#f3f0ed]/25">
                      {t('uploadSubtitle')}
                    </p>
                  </div>
                </button>
              )}

              {hasReference && (
                <p className="mt-2 text-[9px] leading-relaxed text-[#f3f0ed]/30">
                  {t('referenceDescription')}
                </p>
              )}
            </div>

            {/* ── Seções básicas ──────────────────────────────────────── */}
            <Section title={tSections('characterType')} icon={Users}>
              <ImageOptionGrid
                options={CHARACTER_TYPES}
                value={selections.characterType}
                onChange={(v) => set('characterType', v)}
                disabled={hasReference}
              />
            </Section>

            <Section title={tSections('gender')} icon={ImageIcon}>
              <ImageOptionGrid
                options={GENDER_TYPES}
                value={selections.gender}
                onChange={(v) => set('gender', v)}
                disabled={hasReference}
              />
            </Section>

            <Section title={tSections('ethnicity')} icon={Globe}>
              <ImageOptionGrid
                options={ETHNICITY_TYPES}
                value={selections.ethnicity}
                onChange={(v) => set('ethnicity', v)}
                disabled={hasReference}
              />
            </Section>

            <Section title={tSections('skinColor')} icon={CircleDot}>
              <ImageOptionGrid
                options={SKIN_COLORS}
                value={selections.skinColor}
                onChange={(v) => set('skinColor', v)}
                disabled={hasReference}
              />
            </Section>

            <Section title={tSections('eyeColor')} icon={Palette}>
              <ImageOptionGrid
                options={EYE_COLORS}
                value={selections.eyeColor}
                onChange={(v) => set('eyeColor', v)}
                disabled={hasReference}
              />
            </Section>

            <Section title={tSections('skinCondition')} icon={User}>
              <ImageOptionGrid
                options={SKIN_CONDITIONS}
                value={selections.skinCondition}
                onChange={(v) => set('skinCondition', v)}
                disabled={hasReference}
              />
            </Section>

            <Section title={tSections('age')} icon={ImageIcon}>
              <OptionPills
                options={AGE_OPTIONS}
                value={selections.age}
                onChange={(v) => set('age', v)}
                disabled={hasReference}
              />
            </Section>

            {/* ── Configurações avançadas ──────────────────────────────── */}
            <div className="border-b border-[#f3f0ed]/[0.05] px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10">
                  <Sparkles className="h-3.5 w-3.5 text-[#a2dd00]" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/55">
                  {tSections('advancedConfig')}
                </span>
              </div>

              <div className="flex gap-2">
                {advancedTabsLocalized.map((item) => (
                  <AdvancedTabCard
                    key={item.id}
                    image={item.image}
                    label={item.label}
                    active={advancedTab === item.id}
                    onClick={() => setAdvancedTab(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Sub-seções avançadas */}
            {advancedTab === 'face' && (
              <>
                <Section title={tSections('eyeType')} icon={Eye}>
                  <ImageOptionGrid
                    options={EYES_TYPES}
                    value={selections.eyeType}
                    onChange={(v) => set('eyeType', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('eyeDetails')} icon={Eye}>
                  <ImageOptionGrid
                    options={EYES_DETAILS}
                    value={selections.eyeDetails}
                    onChange={(v) => set('eyeDetails', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('mouthTeeth')} icon={User}>
                  <ImageOptionGrid
                    options={MOUTH_TEETH}
                    value={selections.mouth}
                    onChange={(v) => set('mouth', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('ears')} icon={User}>
                  <ImageOptionGrid
                    options={EARS_OPTIONS}
                    value={selections.ears}
                    onChange={(v) => set('ears', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('horns')} icon={User}>
                  <ImageOptionGrid
                    options={HORNS_OPTIONS}
                    value={selections.horns}
                    onChange={(v) => set('horns', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('skinMaterial')} icon={User}>
                  <ImageOptionGrid
                    options={FACE_SKIN_MATERIAL}
                    value={selections.faceSkinMaterial}
                    onChange={(v) => set('faceSkinMaterial', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('surfacePattern')} icon={User}>
                  <ImageOptionGrid
                    options={SURFACE_PATTERNS}
                    value={selections.surfacePattern}
                    onChange={(v) => set('surfacePattern', v)}
                    disabled={hasReference}
                  />
                </Section>
              </>
            )}

            {advancedTab === 'body' && (
              <>
                <Section title={tSections('bodyType')} icon={PersonStanding}>
                  <ImageOptionGrid
                    options={BODY_TYPES}
                    value={selections.bodyType}
                    onChange={(v) => set('bodyType', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('leftArm')} icon={Hand}>
                  <ImageOptionGrid
                    options={LEFT_ARM_OPTIONS}
                    value={selections.leftArm}
                    onChange={(v) => set('leftArm', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('rightArm')} icon={Hand}>
                  <ImageOptionGrid
                    options={RIGHT_ARM_OPTIONS}
                    value={selections.rightArm}
                    onChange={(v) => set('rightArm', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('leftLeg')} icon={PersonStanding}>
                  <ImageOptionGrid
                    options={LEFT_LEG_OPTIONS}
                    value={selections.leftLeg}
                    onChange={(v) => set('leftLeg', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('rightLeg')} icon={PersonStanding}>
                  <ImageOptionGrid
                    options={RIGHT_LEG_OPTIONS}
                    value={selections.rightLeg}
                    onChange={(v) => set('rightLeg', v)}
                    disabled={hasReference}
                  />
                </Section>
              </>
            )}

            {advancedTab === 'style' && (
              <>
                <Section title={tSections('hair')} icon={User}>
                  <ImageOptionGrid
                    options={HAIR_OPTIONS}
                    value={selections.hair}
                    onChange={(v) => set('hair', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('hairColor')} icon={Palette}>
                  <div className={`flex flex-wrap gap-1.5 mt-2 ${hasReference ? 'opacity-30 pointer-events-none' : ''}`}>
                    {HAIR_COLORS.map((opt) => {
                      const active = selections.hairColor === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => set('hairColor', opt.id)}
                          disabled={hasReference}
                          className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all active:scale-95"
                          style={{
                            background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                            color: active ? '#a2dd00' : 'rgba(243,240,237,0.4)',
                            border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                          }}
                        >
                          {t(opt.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </Section>
                <Section title={tSections('accessories')} icon={Sparkles}>
                  <ImageOptionGrid
                    options={ACCESSORIES_OPTIONS}
                    value={selections.accessories}
                    onChange={(v) => set('accessories', v)}
                    disabled={hasReference}
                  />
                </Section>
                <Section title={tSections('renderingStyle')} icon={Palette}>
                  <OptionPills
                    options={RENDERING_OPTIONS}
                    value={selections.renderingStyle}
                    onChange={(v) => set('renderingStyle', v)}
                    disabled={hasReference}
                  />
                </Section>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
