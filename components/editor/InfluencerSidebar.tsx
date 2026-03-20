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
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Section } from './Section';
import { useInfluencerBuilder } from '@/lib/influencer-builder-context';

// ─── CDN Base URL ─────────────────────────────────────────────────────────────

const CDN = 'https://cdn.higgsfield.ai/ai_influencer_option';
const CDN_CAT = 'https://cdn.higgsfield.ai/ai_influencer_parent_category';

// ─── Dados ────────────────────────────────────────────────────────────────────

const CHARACTER_TYPES = [
  { id: 'Human', label: 'Humano', image: `${CDN}/977e0927-1320-426b-9de3-e3a3434dbe7a.webp` },
  { id: 'Ant', label: 'Formiga', image: `${CDN}/d950aa8c-7f58-4277-9f7c-a4c0f073ae99.webp` },
  { id: 'Bee', label: 'Abelha', image: `${CDN}/20b90c9f-d11f-4816-ad7d-f7f388a5a8b0.webp` },
  { id: 'Octopus', label: 'Polvo', image: `${CDN}/cf21cfdb-7f25-49b2-8554-2192046aac83.webp` },
  { id: 'Crocodile', label: 'Crocodilo', image: `${CDN}/79073855-12ba-4339-85ce-dc99ecf4d14c.webp` },
  { id: 'Iguana', label: 'Iguana', image: `${CDN}/5c237648-205d-484d-80e6-baa1c71d9b17.webp` },
  { id: 'Lizard', label: 'Lagarto', image: `${CDN}/039958ce-ec7c-465f-a285-935802b2525d.webp` },
  { id: 'Alien', label: 'Alienígena', image: `${CDN}/077efffe-f459-4dd2-a5a7-064caeca5c10.webp` },
  { id: 'Beetle', label: 'Besouro', image: `${CDN}/704f1cb5-f833-4758-9f99-ba9fe6e2ed53.webp` },
  { id: 'Reptile', label: 'Réptil', image: `${CDN}/cd38cb79-b638-43f3-b546-d31849b6fe05.webp` },
  { id: 'Amphibian', label: 'Anfíbio', image: `${CDN}/d0667019-3b2f-41f6-a09c-5461a5c5b7e0.webp` },
  { id: 'Elf', label: 'Elfo', image: `${CDN}/f5e66aec-8b11-48b0-904b-6c84eb07349e.webp` },
  { id: 'Mantis', label: 'Louva-a-deus', image: `${CDN}/feb723e6-fed4-4e6b-965d-38f50ac4f8d6.webp` },
] as const;

const GENDER_TYPES = [
  { id: 'Female', label: 'Feminino', image: `${CDN}/f9fa514b-620d-433e-bd4e-eadd880de118.webp` },
  { id: 'Male', label: 'Masculino', image: `${CDN}/fb91b108-27fc-4e7c-a8fd-876dc8c30ecf.webp` },
  { id: 'Trans man', label: 'Homem trans', image: `${CDN}/95002c8f-c0d6-4dec-8cac-fc7b50501600.webp` },
  { id: 'Trans woman', label: 'Mulher trans', image: `${CDN}/21fc9f46-6f1f-4aed-8f74-0ca3080c8eec.webp` },
  { id: 'Non-binary', label: 'Não-binário', image: `${CDN}/58a652a4-bf5e-43ca-95a8-8f9e9cef5b6b.webp` },
] as const;

const ETHNICITY_TYPES = [
  { id: 'African', label: 'Africana', image: `${CDN}/22d1da5f-5581-4030-9a14-c8dc61c40abc.webp` },
  { id: 'Asian', label: 'Asiática', image: `${CDN}/c6693caf-8a31-44c6-b9c1-120b44b940a0.webp` },
  { id: 'European', label: 'Europeia', image: `${CDN}/b92e05ee-79a1-4c22-ba32-400c17eb9df3.webp` },
  { id: 'Indian', label: 'Indiana', image: `${CDN}/35cff943-7efb-40cd-a168-dbb1f7cdbebb.webp` },
  { id: 'Middle Eastern', label: 'Oriente Médio', image: `${CDN}/0f49e0cd-7b30-4bb3-94c5-792d684a4492.webp` },
  { id: 'Mixed', label: 'Mista', image: `${CDN}/a992a191-6c13-46e2-991d-f5219b1f5f09.webp` },
] as const;

const SKIN_COLORS = [
  { id: 'Morena', label: 'Morena', image: `${CDN}/4f7118d2-a16f-4cd3-8760-9a44d301baa3.webp` },
  { id: 'Preta', label: 'Preta', image: `${CDN}/4f7118d2-a16f-4cd3-8760-9a44d301baa3.webp` },
  { id: 'Branca', label: 'Branca', image: `${CDN}/4f7118d2-a16f-4cd3-8760-9a44d301baa3.webp` },
] as const;

const EYE_COLORS = [
  { id: 'Black', label: 'Preto', image: `${CDN}/cc87aaa5-568e-4485-ad17-925378e14040.webp` },
  { id: 'Purple', label: 'Roxo', image: `${CDN}/6cb9d132-30d8-4325-83f5-10e8094e85a7.webp` },
  { id: 'Green', label: 'Verde', image: `${CDN}/dba6cbbb-557a-4d71-b5ab-720b5791282c.webp` },
  { id: 'White', label: 'Branco', image: `${CDN}/e6c522cd-c482-44d5-b0fd-d938ac3cdc4e.webp` },
  { id: 'Brown', label: 'Castanho', image: `${CDN}/67ef9f67-0c21-4d78-8044-561792277b4f.webp` },
  { id: 'Black (Solid)', label: 'Sólido/Vazio', image: `${CDN}/5cbd08f7-8c6a-48c4-aa93-d796fe97b8ec.webp` },
  { id: 'White (Blind)', label: 'Cego/Vazio', image: `${CDN}/72969f70-ed33-4f69-ae34-61df12f24dda.webp` },
  { id: 'Deep Brown', label: 'Castanho escuro', image: `${CDN}/3bc13ca9-defe-4fea-a473-2a6e17cbc521.webp` },
  { id: 'Blue', label: 'Azul', image: `${CDN}/15e8f960-c44b-43ae-aafb-4fd79556c420.webp` },
  { id: 'Amber', label: 'Âmbar', image: `${CDN}/4fa90e64-f060-4407-9d1f-ed8b23723c46.webp` },
  { id: 'Red', label: 'Vermelho', image: `${CDN}/0f422982-0f63-460e-a459-2a2fd48f6ee0.webp` },
  { id: 'Grey', label: 'Cinza', image: `${CDN}/cdfa6a1f-c914-44c9-afea-0a0771feeb54.webp` },
] as const;

const SKIN_CONDITIONS = [
  { id: 'Vitiligo', label: 'Vitiligo', image: `${CDN}/bf0f7520-a41a-46b9-b41c-7dc030c22b8b.webp` },
  { id: 'Pigmentation', label: 'Pigmentação', image: `${CDN}/a9e6b3c8-9ab5-4fe3-8b99-5c5fbfa9665c.webp` },
  { id: 'Freckles', label: 'Sardas', image: `${CDN}/a657e9c1-02b6-4083-a058-5f78e56a77ac.webp` },
  { id: 'Birthmarks', label: 'Marcas de nascença', image: `${CDN}/4210a458-66a4-4850-a0ec-5ae20f2214e8.webp` },
  { id: 'Scars', label: 'Cicatrizes', image: `${CDN}/9d28dcde-2709-4fa8-8f61-8a76798b0e1f.webp` },
  { id: 'Burns', label: 'Queimaduras', image: `${CDN}/427cee67-8074-4640-ba06-51e4a5bf7ee3.webp` },
  { id: 'Albinism', label: 'Albinismo', image: `${CDN}/6069e93f-31ce-4840-8e48-c81daee56be0.webp` },
  { id: 'Cracked/dry skin', label: 'Pele rachada', image: `${CDN}/e0fd17ab-f4bd-4950-9fdf-691a98b021c3.webp` },
  { id: 'Wrinkled skin', label: 'Pele enrugada', image: `${CDN}/26f07d76-57a7-4975-b18b-80a5fa2137c5.webp` },
] as const;

// ─── Avançado: Rosto ──────────────────────────────────────────────────────────

const EYES_TYPES = [
  { id: 'Human', label: 'Humano', image: `${CDN}/ce3bb1ff-d120-4539-8aea-51bacb9e96f9.webp` },
  { id: 'Reptile', label: 'Réptil', image: `${CDN}/76b1c85d-dba3-43d6-b6b0-27f2923bdab8.webp` },
  { id: 'Mechanical', label: 'Mecânico', image: `${CDN}/6d7dfd84-741d-4757-9bab-a3ff7cb28612.webp` },
] as const;

const EYES_DETAILS = [
  { id: 'Different colors', label: 'Cores diferentes', image: `${CDN}/199bb0e7-41e8-40af-aae7-77c0c659b260.webp` },
  { id: 'Blind eye', label: 'Olho cego', image: `${CDN}/a1b256a6-45a1-4008-adff-fb0fa1b52c30.webp` },
  { id: 'Scarred eye', label: 'Olho c/ cicatriz', image: `${CDN}/25f40e63-e0b8-4470-aac8-b3b00465f0ac.webp` },
  { id: 'Glowing eye', label: 'Olho brilhante', image: `${CDN}/a6a19585-e8ae-4b5b-8334-f0f24248735d.webp` },
] as const;

const MOUTH_TEETH = [
  { id: 'Small mouth', label: 'Boca pequena', image: `${CDN}/739d39d2-acc7-44b5-82e9-4d3c7bd8a1cc.webp` },
  { id: 'Large mouth', label: 'Boca grande', image: `${CDN}/1baa22a5-87fe-49ce-8094-a35669ae367a.webp` },
  { id: 'No teeth', label: 'Sem dentes', image: `${CDN}/dad0081e-4011-4420-9a95-6a9b96e5c8d9.webp` },
  { id: 'Different teeth', label: 'Dentes diferentes', image: `${CDN}/517e33c9-82ff-4de3-9d38-8205b26e0985.webp` },
  { id: 'Sharp teeth', label: 'Dentes afiados', image: `${CDN}/d44ff654-3b53-4f44-bf54-1c8d0d5c4291.webp` },
  { id: 'Forked tongue', label: 'Língua bifurcada', image: `${CDN}/adb9bb83-1db6-41cc-9933-bae88b72739d.webp` },
  { id: 'Two tongues', label: 'Duas línguas', image: `${CDN}/43aeb851-4c2e-4c3b-b556-21b425eefc75.webp` },
] as const;

const EARS_OPTIONS = [
  { id: 'Human', label: 'Humana', image: `${CDN}/d7a9fd58-5eb3-4e3f-ad56-67bbf3655463.webp` },
  { id: 'Elf', label: 'Elfo', image: `${CDN}/e9b3d421-6cfb-41f9-af4a-fc3649238b91.webp` },
  { id: 'No Ears', label: 'Sem orelhas', image: `${CDN}/562abb29-5f61-4485-83e5-470797a8e591.webp` },
  { id: 'Wing Ears', label: 'Orelhas de asa', image: `${CDN}/9e2c4603-d683-427a-80c0-18332a0f564b.webp` },
] as const;

const HORNS_OPTIONS = [
  { id: 'Small Horns', label: 'Chifres pequenos', image: `${CDN}/9664d380-e818-418e-a42d-f5bf4f1dc19a.webp` },
  { id: 'Big Horns', label: 'Chifres grandes', image: `${CDN}/4a4792eb-215a-4d78-b294-3f0e6bd54c04.webp` },
  { id: 'Antlers', label: 'Galhadas', image: `${CDN}/a7c647b3-c37b-4ecb-a61f-52442e1cad89.webp` },
] as const;

const FACE_SKIN_MATERIAL = [
  { id: 'Human skin', label: 'Pele humana', image: `${CDN}/34d672df-7b82-4b08-b298-4e484ee2d8a2.webp` },
  { id: 'Scales', label: 'Escamas', image: `${CDN}/dfb106df-8549-4758-a9fe-d405f956dc13.webp` },
  { id: 'Fur', label: 'Pelo', image: `${CDN}/b041790f-27b1-491e-900a-df7b44b0c0c3.webp` },
  { id: 'Amphibian skin', label: 'Pele de anfíbio', image: `${CDN}/e471f0b4-7a41-4999-bc8d-9f9f6e030e4c.webp` },
  { id: 'Fish skin', label: 'Pele de peixe', image: `${CDN}/a349307d-dad9-4e4d-98ec-cd84094067a7.webp` },
  { id: 'Metallic', label: 'Metálico', image: `${CDN}/cde0fbeb-0556-4881-9e9e-1d4c5a5cf067.webp` },
] as const;

const SURFACE_PATTERNS = [
  { id: 'Solid', label: 'Sólido', image: `${CDN}/9d344ce6-aecf-4d44-9969-485a6cdbb4c1.webp` },
  { id: 'Stripes', label: 'Listras', image: `${CDN}/979e4934-dbef-4fbe-be38-f3579f2cc78e.webp` },
  { id: 'Spots', label: 'Manchas', image: `${CDN}/7b92c3aa-b271-4e8b-b5ee-331ec8fc3da7.webp` },
  { id: 'Chess', label: 'Xadrez', image: `${CDN}/b956ae69-56df-40a3-baf9-f879ce1292f1.webp` },
  { id: 'Veins', label: 'Veias', image: `${CDN}/14aa0526-5be3-4a2b-a172-3c6af54b4d36.webp` },
  { id: 'Giraffe', label: 'Girafa', image: `${CDN}/e45c30a6-8b55-40df-a85c-ba06a86273af.webp` },
  { id: 'Cowhide', label: 'Bovino', image: `${CDN}/0fd77971-2a7f-45f2-af99-1db26bf6339e.webp` },
] as const;

// ─── Avançado: Corpo ──────────────────────────────────────────────────────────

const BODY_TYPES = [
  { id: 'Slim', label: 'Magro', image: `${CDN}/dadf681a-d007-4ac7-96f0-cb14673687b5.webp` },
  { id: 'Lean', label: 'Esbelto', image: `${CDN}/142ea702-6816-4933-8f42-4b65cade3a8c.webp` },
  { id: 'Athletic', label: 'Atlético', image: `${CDN}/d077688b-6a9a-4cb5-9bfb-b62c06fc7f2b.webp` },
  { id: 'Muscular', label: 'Musculoso', image: `${CDN}/16b7cb85-e2b6-42ac-8d22-30edb28d8eb2.webp` },
  { id: 'Curvy', label: 'Curvilíneo', image: `${CDN}/2bb2fe58-8099-4d62-97f5-5742e564a31f.webp` },
  { id: 'Heavy', label: 'Pesado', image: `${CDN}/c6198edf-f21d-4e3e-9ac5-d4a3333ceb6f.webp` },
  { id: 'Skinny', label: 'Esquelético', image: `${CDN}/b8109486-db80-4bef-b2c6-3f823cde5eb7.webp` },
] as const;

const LEFT_ARM_OPTIONS = [
  { id: 'Normal arm', label: 'Normal', image: `${CDN}/d8b70b8b-07fe-4056-b654-40144f0abf13.webp` },
  { id: 'Cute arm', label: 'Fofo', image: `${CDN}/2896f074-69bb-4ac7-be86-7203c33ac5b6.webp` },
  { id: 'Robotic arm', label: 'Robótico', image: `${CDN}/f168d95a-5744-46d7-ac2f-039a0e7d78ff.webp` },
  { id: 'Prosthetic arm', label: 'Protético', image: `${CDN}/da1534dc-1166-44e6-8f38-8c7d5f172fa8.webp` },
  { id: 'Mechanical arm', label: 'Mecânico', image: `${CDN}/335cc7d7-a1bc-45d0-9d35-f897c081d60b.webp` },
  { id: 'None', label: 'Nenhum', image: `${CDN}/a9c17f68-ee40-450b-9f82-4cce5b7d4ccc.webp` },
] as const;

const RIGHT_ARM_OPTIONS = [
  { id: 'Normal arm', label: 'Normal', image: `${CDN}/030fe9e3-b4b6-490b-a1fa-163680682b89.webp` },
  { id: 'Cute arm', label: 'Fofo', image: `${CDN}/259eac0d-f054-4b09-9101-f09934d07663.webp` },
  { id: 'Robotic arm', label: 'Robótico', image: `${CDN}/1e0fdb91-e757-419e-9f40-250b084904cc.webp` },
  { id: 'Prosthetic arm', label: 'Protético', image: `${CDN}/d1db6a3f-cbfd-43f8-97ab-002341774488.webp` },
  { id: 'Mechanical arm', label: 'Mecânico', image: `${CDN}/4bcab738-e4b9-4831-9612-c3263ce9cbae.webp` },
  { id: 'None', label: 'Nenhum', image: `${CDN}/764b52a2-006b-46e0-a649-5c71e8cd9915.webp` },
] as const;

const LEFT_LEG_OPTIONS = [
  { id: 'Normal leg', label: 'Normal', image: `${CDN}/eb416e7d-63c5-40df-86a9-6787c5784ef5.webp` },
  { id: 'Cute leg', label: 'Fofo', image: `${CDN}/5d927e55-999a-4319-90de-4723bed162fb.webp` },
  { id: 'Robotic leg', label: 'Robótico', image: `${CDN}/1daebe83-c57e-4594-b6e0-f35b1608fbdd.webp` },
  { id: 'Prosthetic leg', label: 'Protético', image: `${CDN}/d7e4fbd7-4eed-497d-b627-9b50adc1d1fd.webp` },
  { id: 'Mechanical leg', label: 'Mecânico', image: `${CDN}/a709b1c0-7f65-42dd-b24c-a81f3ca4d666.webp` },
  { id: 'None', label: 'Nenhum', image: `${CDN}/2137532d-0b3b-4c60-8930-f608135c73c2.webp` },
] as const;

const RIGHT_LEG_OPTIONS = [
  { id: 'Normal leg', label: 'Normal', image: `${CDN}/61905af5-e21a-48d9-90ad-b87d47d6858b.webp` },
  { id: 'Cute leg', label: 'Fofo', image: `${CDN}/4d22f534-f865-49a4-9327-dfd082b0fb79.webp` },
  { id: 'Robotic leg', label: 'Robótico', image: `${CDN}/475314c9-5b3e-4c60-a14d-fffda3c5c852.webp` },
  { id: 'Prosthetic leg', label: 'Protético', image: `${CDN}/9d2bda1f-bd7e-4acb-9c17-87e8528efa1d.webp` },
  { id: 'Mechanical leg', label: 'Mecânico', image: `${CDN}/e8e31345-3d33-4608-ab56-87ce4d185d77.webp` },
  { id: 'None', label: 'Nenhum', image: `${CDN}/5b3674c7-0c91-4af4-b9c2-e0c352466c01.webp` },
] as const;

// ─── Avançado: Estilo ─────────────────────────────────────────────────────────

const HAIR_OPTIONS = [
  { id: 'Bald', label: 'Careca', image: `${CDN}/ca8b2954-900c-424f-9fda-acc5c37d58dd.webp` },
  { id: 'Short hair', label: 'Curto', image: `${CDN}/383399be-fe36-4196-9b45-f328cf40eb1e.webp` },
  { id: 'Long hair', label: 'Longo', image: `${CDN}/9145dee8-7136-4ee9-a464-20268fed4a37.webp` },
  { id: 'Afro', label: 'Afro', image: `${CDN}/7fc8fcc7-310f-406c-94c2-c4fc56568d40.webp` },
  { id: 'Punk hairstyle', label: 'Punk', image: `${CDN}/a6555ba9-bd9b-4839-898d-3758e9788d18.webp` },
  { id: 'Fur', label: 'Pelo', image: `${CDN}/1de2b775-27ed-4465-a930-f8cb2d73bd9f.webp` },
  { id: 'Tentacles', label: 'Tentáculos', image: `${CDN}/b3c8c28b-c19d-49bf-8223-42a5e3a66edb.webp` },
  { id: 'Spines', label: 'Espinhos', image: `${CDN}/35fd3acc-eda0-4b00-a19a-32ad85ce7766.webp` },
] as const;

const HAIR_COLORS = [
  { id: 'Black', label: 'Preto' },
  { id: 'Dark Brown', label: 'Castanho escuro' },
  { id: 'Brown', label: 'Castanho' },
  { id: 'Light Brown', label: 'Castanho claro' },
  { id: 'Blonde', label: 'Loiro' },
  { id: 'Platinum Blonde', label: 'Platinado' },
  { id: 'Red', label: 'Ruivo' },
  { id: 'Ginger', label: 'Ruivo claro' },
  { id: 'Auburn', label: 'Acaju' },
  { id: 'Grey', label: 'Grisalho' },
  { id: 'White', label: 'Branco' },
  { id: 'Blue', label: 'Azul' },
  { id: 'Pink', label: 'Rosa' },
  { id: 'Purple', label: 'Roxo' },
  { id: 'Green', label: 'Verde' },
  { id: 'Ombre', label: 'Ombré' },
  { id: 'Highlights', label: 'Mechas' },
] as const;

const ACCESSORIES_OPTIONS = [
  { id: 'Tattoos', label: 'Tatuagens', image: `${CDN}/2c4a9764-5449-4c78-a5c1-d6b13034d222.webp` },
  { id: 'Piercing', label: 'Piercing', image: `${CDN}/587f72de-6688-441a-8696-77bd251fa138.webp` },
  { id: 'Scarification', label: 'Escarificação', image: `${CDN}/855ceb60-0637-4266-909b-2713bb459da7.webp` },
  { id: 'Symbols', label: 'Símbolos', image: `${CDN}/3bdb0c00-765a-4405-b037-bd064c39309c.webp` },
  { id: 'Cyber markings', label: 'Marcas cyber', image: `${CDN}/123f2efe-cd4b-42a9-89e7-db1a49ebf089.webp` },
] as const;

// ─── Abas avançadas ──────────────────────────────────────────────────────────

const ADVANCED_TABS = [
  { id: 'face' as const, label: 'Rosto', image: `${CDN_CAT}/e0805c7f-c1b0-4c68-bbc7-bab5ae86d6df.webp` },
  { id: 'body' as const, label: 'Corpo', image: `${CDN_CAT}/ee30f691-5d7b-4788-af82-73d86b6f32bb.webp` },
  { id: 'style' as const, label: 'Estilo', image: `${CDN_CAT}/5b67892f-ef65-4f8d-af20-e0f35a13f1b3.webp` },
] as const;

// ─── ImageOptionGrid ──────────────────────────────────────────────────────────

function ImageOptionGrid({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: string; label: string; image: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="group relative aspect-square overflow-hidden rounded-xl transition-all active:scale-95"
            style={{
              border: `2px solid ${active ? 'rgba(162,221,0,0.6)' : 'rgba(243,240,237,0.06)'}`,
              boxShadow: active ? '0 0 12px rgba(162,221,0,0.15)' : 'none',
            }}
          >
            <Image
              src={opt.image}
              alt={opt.label}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="120px"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            <span className="absolute bottom-1.5 left-2 text-[11px] font-bold text-white drop-shadow-md">
              {opt.label}
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
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all active:scale-95"
            style={{
              background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
              color: active ? '#a2dd00' : 'rgba(243,240,237,0.4)',
              border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
            }}
          >
            {opt}
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
  const { selections, set, reset, prompt } = useInfluencerBuilder();
  const [tab, setTab] = useState<'builder' | 'prompt'>('builder');
  const [advancedTab, setAdvancedTab] = useState<'face' | 'body' | 'style'>('face');

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
            Construtor
          </button>
          <button
            onClick={() => setTab('prompt')}
            className="rounded-md px-3 py-1.5 text-[10px] font-bold tracking-wider transition-all"
            style={{
              background: tab === 'prompt' ? 'rgba(162,221,0,0.12)' : 'transparent',
              color: tab === 'prompt' ? '#a2dd00' : 'rgba(243,240,237,0.35)',
            }}
          >
            Prompt
          </button>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#f3f0ed]/30 transition-colors hover:text-[#f3f0ed]/60"
        >
          <RotateCcw className="h-3 w-3" />
          Resetar
        </button>
      </div>

      {/* Área de conteúdo */}
      <div className="sidebar-scroll flex-1 overflow-y-auto">
        {tab === 'prompt' ? (
          <div className="p-4 space-y-2">
            <p className="text-[10px] font-bold tracking-[0.1em] text-[#f3f0ed]/40">
              PROMPT GERADO (INGLÊS)
            </p>
            <textarea
              rows={10}
              readOnly
              value={prompt}
              className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-xs leading-relaxed text-[#f3f0ed]/70 placeholder-[#f3f0ed]/25 outline-none"
            />
            <p className="text-[9px] text-[#f3f0ed]/20">
              Este prompt é gerado automaticamente com base nas suas seleções no Construtor.
            </p>
          </div>
        ) : (
          <>
            {/* ── Seções básicas ──────────────────────────────────────── */}
            <Section title="TIPO DE PERSONAGEM" icon={Users}>
              <ImageOptionGrid
                options={CHARACTER_TYPES}
                value={selections.characterType}
                onChange={(v) => set('characterType', v)}
              />
            </Section>

            <Section title="GÊNERO" icon={ImageIcon}>
              <ImageOptionGrid
                options={GENDER_TYPES}
                value={selections.gender}
                onChange={(v) => set('gender', v)}
              />
            </Section>

            <Section title="ETNIA" icon={Globe}>
              <ImageOptionGrid
                options={ETHNICITY_TYPES}
                value={selections.ethnicity}
                onChange={(v) => set('ethnicity', v)}
              />
            </Section>

            <Section title="COR DA PELE" icon={CircleDot}>
              <ImageOptionGrid
                options={SKIN_COLORS}
                value={selections.skinColor}
                onChange={(v) => set('skinColor', v)}
              />
            </Section>

            <Section title="COR DOS OLHOS" icon={Palette}>
              <ImageOptionGrid
                options={EYE_COLORS}
                value={selections.eyeColor}
                onChange={(v) => set('eyeColor', v)}
              />
            </Section>

            <Section title="CONDIÇÕES DA PELE" icon={User}>
              <ImageOptionGrid
                options={SKIN_CONDITIONS}
                value={selections.skinCondition}
                onChange={(v) => set('skinCondition', v)}
              />
            </Section>

            <Section title="IDADE" icon={ImageIcon}>
              <OptionPills
                options={['Adolescente', 'Jovem adulto', 'Adulto', 'Meia-idade', 'Idoso']}
                value={selections.age}
                onChange={(v) => set('age', v)}
              />
            </Section>

            {/* ── Configurações avançadas ──────────────────────────────── */}
            <div className="border-b border-[#f3f0ed]/[0.05] px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10">
                  <Sparkles className="h-3.5 w-3.5 text-[#a2dd00]" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/55">
                  CONFIGURAÇÕES AVANÇADAS
                </span>
              </div>

              <div className="flex gap-2">
                {ADVANCED_TABS.map((t) => (
                  <AdvancedTabCard
                    key={t.id}
                    image={t.image}
                    label={t.label}
                    active={advancedTab === t.id}
                    onClick={() => setAdvancedTab(t.id)}
                  />
                ))}
              </div>
            </div>

            {/* Sub-seções avançadas */}
            {advancedTab === 'face' && (
              <>
                <Section title="OLHOS - TIPO" icon={Eye}>
                  <ImageOptionGrid
                    options={EYES_TYPES}
                    value={selections.eyeType}
                    onChange={(v) => set('eyeType', v)}
                  />
                </Section>
                <Section title="OLHOS - DETALHES" icon={Eye}>
                  <ImageOptionGrid
                    options={EYES_DETAILS}
                    value={selections.eyeDetails}
                    onChange={(v) => set('eyeDetails', v)}
                  />
                </Section>
                <Section title="BOCA & DENTES" icon={User}>
                  <ImageOptionGrid
                    options={MOUTH_TEETH}
                    value={selections.mouth}
                    onChange={(v) => set('mouth', v)}
                  />
                </Section>
                <Section title="ORELHAS" icon={User}>
                  <ImageOptionGrid
                    options={EARS_OPTIONS}
                    value={selections.ears}
                    onChange={(v) => set('ears', v)}
                  />
                </Section>
                <Section title="CHIFRES" icon={User}>
                  <ImageOptionGrid
                    options={HORNS_OPTIONS}
                    value={selections.horns}
                    onChange={(v) => set('horns', v)}
                  />
                </Section>
                <Section title="MATERIAL DA PELE" icon={User}>
                  <ImageOptionGrid
                    options={FACE_SKIN_MATERIAL}
                    value={selections.faceSkinMaterial}
                    onChange={(v) => set('faceSkinMaterial', v)}
                  />
                </Section>
                <Section title="PADRÃO DE SUPERFÍCIE" icon={User}>
                  <ImageOptionGrid
                    options={SURFACE_PATTERNS}
                    value={selections.surfacePattern}
                    onChange={(v) => set('surfacePattern', v)}
                  />
                </Section>
              </>
            )}

            {advancedTab === 'body' && (
              <>
                <Section title="TIPO DE CORPO" icon={PersonStanding}>
                  <ImageOptionGrid
                    options={BODY_TYPES}
                    value={selections.bodyType}
                    onChange={(v) => set('bodyType', v)}
                  />
                </Section>
                <Section title="BRAÇO ESQUERDO" icon={Hand}>
                  <ImageOptionGrid
                    options={LEFT_ARM_OPTIONS}
                    value={selections.leftArm}
                    onChange={(v) => set('leftArm', v)}
                  />
                </Section>
                <Section title="BRAÇO DIREITO" icon={Hand}>
                  <ImageOptionGrid
                    options={RIGHT_ARM_OPTIONS}
                    value={selections.rightArm}
                    onChange={(v) => set('rightArm', v)}
                  />
                </Section>
                <Section title="PERNA ESQUERDA" icon={PersonStanding}>
                  <ImageOptionGrid
                    options={LEFT_LEG_OPTIONS}
                    value={selections.leftLeg}
                    onChange={(v) => set('leftLeg', v)}
                  />
                </Section>
                <Section title="PERNA DIREITA" icon={PersonStanding}>
                  <ImageOptionGrid
                    options={RIGHT_LEG_OPTIONS}
                    value={selections.rightLeg}
                    onChange={(v) => set('rightLeg', v)}
                  />
                </Section>
              </>
            )}

            {advancedTab === 'style' && (
              <>
                <Section title="CABELO / CABEÇA" icon={User}>
                  <ImageOptionGrid
                    options={HAIR_OPTIONS}
                    value={selections.hair}
                    onChange={(v) => set('hair', v)}
                  />
                </Section>
                <Section title="COR DO CABELO" icon={Palette}>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {HAIR_COLORS.map((opt) => {
                      const active = selections.hairColor === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => set('hairColor', opt.id)}
                          className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all active:scale-95"
                          style={{
                            background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                            color: active ? '#a2dd00' : 'rgba(243,240,237,0.4)',
                            border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </Section>
                <Section title="ACESSÓRIOS & MARCAS" icon={Sparkles}>
                  <ImageOptionGrid
                    options={ACCESSORIES_OPTIONS}
                    value={selections.accessories}
                    onChange={(v) => set('accessories', v)}
                  />
                </Section>
                <Section title="ESTILO DE RENDERIZAÇÃO" icon={Palette}>
                  <OptionPills
                    options={['Hiper-realista', 'Anime', 'Cartoon', 'Ilustração 2D']}
                    value={selections.renderingStyle}
                    onChange={(v) => set('renderingStyle', v)}
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
