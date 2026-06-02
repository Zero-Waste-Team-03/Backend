import dataSource from 'src/infrastructure/db/data-source';
import {
  searchPortraits,
  searchFood,
  searchBadgeIcons,
} from './pexels-client';
import { User, UserRoleValues } from 'src/core/user/entities/user.entity';
import { UserSettings } from 'src/core/user/entities/user-settings.entity';
import { Location } from 'src/common/locations/entities/location.entity';
import { Attachment, UploadStatusValues } from 'src/common/modules/attachment/entities/attachment.entity';
import { Category, CategorySensitivityValues } from 'src/core/category/entities/category.entity';
import { Donation, DonationStatusValues, DonationUrgencyValues } from 'src/core/donation/entities/donation.entity';
import { DonationPhoto } from 'src/core/donation/entities/donation-photo.entity';
import { DonationLike } from 'src/core/donation/entities/donation-like.entity';
import { Reservation, ReservationStatusValues } from 'src/core/reservation/entities/reservation.entity';
import { Conversation, ConversationStatusValues } from 'src/core/chat/entities/conversation.entity';
import { Message } from 'src/core/chat/entities/message.entity';
import { Badge } from 'src/core/gamification/entities/badge.entity';
import { Achievement } from 'src/core/gamification/entities/achievement.entity';
import { Notification } from 'src/core/notifications/entities/notification.entity';
import { NOTIFICATION_TYPE } from 'src/core/notifications/enums/notification-type.enum';
import { NOTIFICATION_ACTION } from 'src/core/notifications/constants/notification-actions';
import { Report, ReportStatusValues, ReportTargetTypeValues } from 'src/core/reporting/entities/report.entity';
import { Token } from 'src/core/notifications/entities/token.entity';
import {
  ReputationLog,
  ReputationLogSourceValues,
} from 'src/core/leaderboard/entities/reputation-log.entity';
import { generateHash } from 'src/common/utils/authentication/hash.utils';

const PLACEHOLDER_URL = 'https://images.pexels.com/photos/3561339/pexels-photo-3561339.jpeg?auto=compress&cs=tinysrgb&w=400';

type SeedUser = {
  email: string;
  password: string;
  displayName: string;
  description: string;
  role: User['role'];
  reputationScore: number;
  isVerified: boolean;
  isFoodSaver: boolean;
  location: { latitude?: number; longitude?: number; neighborhood?: string; city: string; country: string };
};

type SeedCategory = { name: string; sensitivity: Category['sensitivity']; reputationGain: number };

type SeedDonation = {
  title: string;
  description: string;
  quantity: number;
  foodWeightKg: number;
  specification: Record<string, any>;
  expiryDate: Date;
  urgency: Donation['urgency'];
  safetyChecklistCompleted: boolean;
  listingExpiresAt?: Date;
  status: Donation['status'];
  donorEmail: string;
  categoryName: string;
  location?: Partial<Location>;
  foodPhotoSearchQuery?: string;
};

type SeedReservation = {
  donationTitle: string;
  donorEmail: string;
  beneficiaryEmail: string;
  status: Reservation['status'];
  quantity: number;
  confirmedAt?: Date | null;
};

type SeedConversation = {
  donationTitle: string;
  donorEmail: string;
  beneficiaryEmail: string;
  status: Conversation['status'];
  lastMessage?: string | null;
};

type SeedMessage = {
  donationTitle: string;
  donorEmail: string;
  beneficiaryEmail: string;
  senderEmail: string;
  content: string;
};

type SeedReport = {
  targetType: typeof ReportTargetTypeValues.USER | typeof ReportTargetTypeValues.DONATION;
  targetUserEmail?: string;
  targetDonationTitle?: string;
  targetDonationOwnerEmail?: string;
  reporterEmail: string;
  reason: string;
  description?: string;
  status: Report['status'];
  reviewedByEmail?: string;
};

type SeedBadge = {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

type SeedAchievement = { userEmail: string; badgeCode: string; awardedAt: Date };

const CATEGORIES: SeedCategory[] = [
  { name: 'Bakery', sensitivity: CategorySensitivityValues.LOW, reputationGain: 10 },
  { name: 'Cooked Meals', sensitivity: CategorySensitivityValues.HIGH, reputationGain: 20 },
  { name: 'Dairy', sensitivity: CategorySensitivityValues.HIGH, reputationGain: 15 },
  { name: 'Fruits & Vegetables', sensitivity: CategorySensitivityValues.MEDIUM, reputationGain: 10 },
  { name: 'Dry Goods', sensitivity: CategorySensitivityValues.LOW, reputationGain: 5 },
  { name: 'Beverages', sensitivity: CategorySensitivityValues.LOW, reputationGain: 5 },
];

const USERS: SeedUser[] = [
  {
    email: 'admin@gaspzero.local',
    password: 'Admin@12345',
    displayName: 'Amina Bensalem',
    description: 'Platform administrator. Passionate about reducing food waste and building technology for social good.',
    role: UserRoleValues.ADMINISTRATOR,
    reputationScore: 1200,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.7538, longitude: 3.0588, neighborhood: 'Centre Ville', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'karim@gaspzero.local',
    password: 'Karim@12345',
    displayName: 'Karim Meziane',
    description: 'Local restaurant owner. I regularly donate surplus food to my community.',
    role: UserRoleValues.USER,
    reputationScore: 680,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.7529, longitude: 3.0422, neighborhood: 'Bab El Oued', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'salima@gaspzero.local',
    password: 'Salima@12345',
    displayName: 'Salima Rahmani',
    description: 'Community volunteer and food rescue advocate. Together we can end hunger.',
    role: UserRoleValues.USER,
    reputationScore: 520,
    isVerified: true,
    isFoodSaver: false,
    location: { latitude: 35.6971, longitude: -0.6308, neighborhood: 'Hai El Yasmine', city: 'Oran', country: 'Algeria' },
  },
  {
    email: 'yassine@gaspzero.local',
    password: 'Yassine@12345',
    displayName: 'Yassine Benali',
    description: 'Student volunteer. Picking up donations on my way home from university.',
    role: UserRoleValues.USER,
    reputationScore: 180,
    isVerified: true,
    isFoodSaver: false,
    location: { latitude: 36.84, longitude: 7.7497, neighborhood: 'Emir Abdelkader', city: 'Annaba', country: 'Algeria' },
  },
  {
    email: 'nour@gaspzero.local',
    password: 'Nour@12345',
    displayName: 'Nour Hamdi',
    description: 'Home cook with a big heart. No food goes to waste in my kitchen!',
    role: UserRoleValues.USER,
    reputationScore: 340,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.365, longitude: 6.6147, neighborhood: 'Ciloc', city: 'Constantine', country: 'Algeria' },
  },
  {
    email: 'ngo@gaspzero.local',
    password: 'Ngo@12345',
    displayName: 'Association El Amel',
    description: 'Non-profit organization dedicated to fighting hunger and food insecurity in the region.',
    role: UserRoleValues.ORGANIZATION,
    reputationScore: 890,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.7538, longitude: 3.0588, neighborhood: 'Hydra', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'hopital@gaspzero.local',
    password: 'Hopital@12345',
    displayName: 'Hôpital Universitaire d\'Oran',
    description: 'Hospital cafeteria donating surplus meals daily to reduce waste and support the community.',
    role: UserRoleValues.ORGANIZATION,
    reputationScore: 750,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 35.701, longitude: -0.622, neighborhood: 'Bir El Djir', city: 'Oran', country: 'Algeria' },
  },
  {
    email: 'supermarche@gaspzero.local',
    password: 'Supermarche@12345',
    displayName: 'Supermarché El Moustakbal',
    description: 'Local grocery chain committed to reducing food waste through daily donations.',
    role: UserRoleValues.STORE,
    reputationScore: 420,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.738, longitude: 3.07, neighborhood: 'El Biar', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'boulangerie@gaspzero.local',
    password: 'Boulangerie@12345',
    displayName: 'Boulangerie Sid Ahmed',
    description: 'Traditional Algerian bakery. Fresh bread daily — leftovers go to those who need them.',
    role: UserRoleValues.STORE,
    reputationScore: 310,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.755, longitude: 3.045, neighborhood: 'Casbah', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'mairie@gaspzero.local',
    password: 'Mairie@12345',
    displayName: 'Mairie de Constantine',
    description: 'Municipal authority overseeing food donation compliance and safety standards.',
    role: UserRoleValues.LOCAL_AUTHORITY,
    reputationScore: 200,
    isVerified: true,
    isFoodSaver: false,
    location: { latitude: 36.365, longitude: 6.6147, neighborhood: 'Centre Ville', city: 'Constantine', country: 'Algeria' },
  },
  {
    email: 'fatima@gaspzero.local',
    password: 'Fatima@12345',
    displayName: 'Fatima Zerrouki',
    description: 'Retired teacher volunteering at the local food bank. Every meal matters.',
    role: UserRoleValues.USER,
    reputationScore: 260,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.1881, longitude: 5.4167, neighborhood: 'El Karma', city: 'Sétif', country: 'Algeria' },
  },
  {
    email: 'reda@gaspzero.local',
    password: 'Reda@12345',
    displayName: 'Reda Kaci',
    description: 'Delivery driver volunteering to transport donations across the city.',
    role: UserRoleValues.USER,
    reputationScore: 150,
    isVerified: false,
    isFoodSaver: false,
    location: { latitude: 36.7538, longitude: 3.0588, neighborhood: 'Hussein Dey', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'sara@gaspzero.local',
    password: 'Sara@12345',
    displayName: 'Sara Bouzid',
    description: 'Nutritionist advising on food safety for donated items.',
    role: UserRoleValues.USER,
    reputationScore: 190,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 35.6969, longitude: -0.6331, neighborhood: 'Mdina Jdida', city: 'Oran', country: 'Algeria' },
  },
  {
    email: 'mosque@gaspzero.local',
    password: 'Mosque@12345',
    displayName: 'Mosquée Emir Abdelkader',
    description: 'Community mosque organizing iftar donations during Ramadan and weekly food drives.',
    role: UserRoleValues.ORGANIZATION,
    reputationScore: 610,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.75, longitude: 3.06, neighborhood: 'Bouroumane', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'epicerie@gaspzero.local',
    password: 'Epicerie@12345',
    displayName: 'Épicerie El Khair',
    description: 'Neighborhood grocery store donating near-expiry dry goods every week.',
    role: UserRoleValues.STORE,
    reputationScore: 270,
    isVerified: true,
    isFoodSaver: true,
    location: { latitude: 36.84, longitude: 7.7497, neighborhood: 'Saint Cloud', city: 'Annaba', country: 'Algeria' },
  },
  {
    email: 'wali@gaspzero.local',
    password: 'Wali@12345',
    displayName: 'Wilaya d\'Alger — Bureau de l\'Action Sociale',
    description: 'Government authority ensuring compliance with food safety regulations for community donations.',
    role: UserRoleValues.LOCAL_AUTHORITY,
    reputationScore: 100,
    isVerified: true,
    isFoodSaver: false,
    location: { latitude: 36.7538, longitude: 3.0588, neighborhood: 'Alger Centre', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'leila@gaspzero.local',
    password: 'Leila@12345',
    displayName: 'Leila Mansouri',
    description: 'University student running a campus food-sharing initiative.',
    role: UserRoleValues.USER,
    reputationScore: 95,
    isVerified: false,
    isFoodSaver: false,
    location: { latitude: 36.72, longitude: 3.17, neighborhood: 'Darin', city: 'Boumerdès', country: 'Algeria' },
  },
  {
    email: 'omar@gaspzero.local',
    password: 'Omar@12345',
    displayName: 'Omar Hadj',
    description: 'Catering company owner donating surplus event food.',
    role: UserRoleValues.USER,
    reputationScore: 45,
    isVerified: false,
    isFoodSaver: false,
    location: { latitude: 36.365, longitude: 6.6147, neighborhood: 'Zouaghi', city: 'Constantine', country: 'Algeria' },
  },
  {
    email: 'hotel@gaspzero.local',
    password: 'Hotel@12345',
    displayName: 'Hôtel El Aurassi',
    description: 'Four-star hotel donating unserved breakfast buffets and banquet leftovers.',
    role: UserRoleValues.ORGANIZATION,
    reputationScore: 55,
    isVerified: false,
    isFoodSaver: true,
    location: { latitude: 36.757, longitude: 3.063, neighborhood: 'El Hamma', city: 'Algiers', country: 'Algeria' },
  },
  {
    email: 'medecins@gaspzero.local',
    password: 'Medecins@12345',
    displayName: 'Médecins du Quartier — Annaba',
    description: 'Local doctors\' association running nutrition programs for underprivileged families.',
    role: UserRoleValues.ORGANIZATION,
    reputationScore: 380,
    isVerified: true,
    isFoodSaver: false,
    location: { latitude: 36.84, longitude: 7.7497, neighborhood: 'Gare', city: 'Annaba', country: 'Algeria' },
  },
];

const DONATIONS: SeedDonation[] = [
  {
    title: 'Fresh baguettes — this morning\'s batch',
    description: 'Unsold baguettes and pain de campagne from this morning\'s bake. Still perfectly fresh — best before end of day. Wrapped in paper, ready for pickup.',
    quantity: 20,
    foodWeightKg: 80,
    specification: { packaging: 'paper', allergens: ['gluten', 'wheat'], dietary: ['vegetarian'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 10),
    urgency: DonationUrgencyValues.LOW,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'boulangerie@gaspzero.local',
    categoryName: 'Bakery',
    location: { latitude: 36.755, longitude: 3.045, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'fresh bread baguette',
  },
  {
    title: 'Couscous royal — simmered vegetables & lamb',
    description: 'Large tray of homemade couscous with seven vegetables and lamb, leftover from a family gathering. Needs reheating, consumed same day.',
    quantity: 8,
    foodWeightKg: 12,
    specification: { requiresColdChain: false, allergens: ['gluten', 'celery'], dietary: [], servingTemperature: 'hot' },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 8),
    urgency: DonationUrgencyValues.HIGH,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'nour@gaspzero.local',
    categoryName: 'Cooked Meals',
    location: { latitude: 36.365, longitude: 6.6147, city: 'Constantine', country: 'Algeria' },
    foodPhotoSearchQuery: 'couscous vegetables',
  },
  {
    title: 'Seasonal fruit crate — oranges, apples & bananas',
    description: 'Mixed fruit assortment close to display deadline but still fresh and flavorful. Perfect for community kitchens.',
    quantity: 15,
    foodWeightKg: 25,
    specification: { items: ['oranges', 'apples', 'bananas'], dietary: ['vegan', 'vegetarian'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 48),
    urgency: DonationUrgencyValues.MEDIUM,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 36),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'supermarche@gaspzero.local',
    categoryName: 'Fruits & Vegetables',
    location: { latitude: 36.738, longitude: 3.07, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'oranges apples bananas fruit',
  },
  {
    title: 'Yogurt cups — assorted flavors',
    description: '50 cups of assorted flavored yogurt (strawberry, vanilla, peach). Stored properly at 4°C. Expiring tomorrow.',
    quantity: 50,
    foodWeightKg: 15,
    specification: { requiresColdChain: true, allergens: ['dairy', 'milk'], storageTemp: '2-4°C' },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    urgency: DonationUrgencyValues.HIGH,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 18),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'hopital@gaspzero.local',
    categoryName: 'Dairy',
    location: { latitude: 35.701, longitude: -0.622, city: 'Oran', country: 'Algeria' },
    foodPhotoSearchQuery: 'yogurt cups',
  },
  {
    title: 'Semolina & pasta — dry goods bundle',
    description: 'Surplus dry goods from our pantry refresh: semolina, penne, fusilli, and lentils. Long shelf life, no refrigeration needed.',
    quantity: 30,
    foodWeightKg: 45,
    specification: { packaging: 'plastic bags & boxes', allergens: ['gluten', 'wheat'], dietary: ['vegan'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    urgency: DonationUrgencyValues.LOW,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'ngo@gaspzero.local',
    categoryName: 'Dry Goods',
    location: { latitude: 36.7538, longitude: 3.0588, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'pasta lentils dry goods',
  },
  {
    title: 'Mint tea & orange juice — beverage surplus',
    description: 'Unopened bottles of mint tea and fresh orange juice from a catering event. 24 bottles total.',
    quantity: 24,
    foodWeightKg: 18,
    specification: { items: ['mint tea', 'orange juice'], packaging: 'bottles', dietary: ['vegan'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 72),
    urgency: DonationUrgencyValues.LOW,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'hotel@gaspzero.local',
    categoryName: 'Beverages',
    location: { latitude: 36.757, longitude: 3.063, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'mint tea orange juice bottles',
  },
  {
    title: 'Croissants & pains au chocolat',
    description: 'Breakfast pastries that didn\'t sell this morning. Flaky, buttery, and still delicious.',
    quantity: 30,
    foodWeightKg: 12,
    specification: { allergens: ['gluten', 'wheat', 'dairy', 'eggs'], dietary: ['vegetarian'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 6),
    urgency: DonationUrgencyValues.HIGH,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 5),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'boulangerie@gaspzero.local',
    categoryName: 'Bakery',
    location: { latitude: 36.755, longitude: 3.045, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'croissants pastries',
  },
  {
    title: 'Chorba soup — large batch',
    description: 'Freshly made chorba Frik (traditional Algerian soup) — 10 liters. Packed in sealed containers.',
    quantity: 10,
    foodWeightKg: 15,
    specification: { requiresColdChain: false, allergens: ['gluten', 'celery'], dietary: [], servingTemperature: 'hot' },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 5),
    urgency: DonationUrgencyValues.HIGH,
    safetyChecklistCompleted: false,
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'nour@gaspzero.local',
    categoryName: 'Cooked Meals',
    location: { latitude: 36.365, longitude: 6.6147, city: 'Constantine', country: 'Algeria' },
    foodPhotoSearchQuery: 'chorba soup traditional',
  },
  {
    title: 'Fresh tomatoes, peppers & zucchini',
    description: 'Garden vegetables from the local market coop. Firm and flavorful, no cold chain needed.',
    quantity: 25,
    foodWeightKg: 20,
    specification: { items: ['tomatoes', 'bell peppers', 'zucchini'], dietary: ['vegan', 'vegetarian'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 72),
    urgency: DonationUrgencyValues.MEDIUM,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
    status: DonationStatusValues.RESERVED,
    donorEmail: 'epicerie@gaspzero.local',
    categoryName: 'Fruits & Vegetables',
    location: { latitude: 36.84, longitude: 7.7497, city: 'Annaba', country: 'Algeria' },
    foodPhotoSearchQuery: 'fresh tomatoes peppers vegetables',
  },
  {
    title: 'Cheese slices — assorted',
    description: 'Pre-packaged cheese slices (Gouda, Edam, processed) from our weekly stock rotation. Refrigerated, pick up today.',
    quantity: 40,
    foodWeightKg: 8,
    specification: { requiresColdChain: true, allergens: ['dairy', 'milk'], storageTemp: '2-6°C' },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 48),
    urgency: DonationUrgencyValues.MEDIUM,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    status: DonationStatusValues.COMPLETED,
    donorEmail: 'supermarche@gaspzero.local',
    categoryName: 'Dairy',
    location: { latitude: 36.738, longitude: 3.07, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'cheese slices assorted',
  },
  {
    title: 'Rice & chickpeas — emergency food kit',
    description: 'Bulk rice and canned chickpeas repackaged into 5 kg family portions. Great staple donation.',
    quantity: 20,
    foodWeightKg: 100,
    specification: { packaging: 'vacuum sealed', allergens: [], dietary: ['vegan', 'gluten-free'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180),
    urgency: DonationUrgencyValues.LOW,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
    status: DonationStatusValues.COMPLETED,
    donorEmail: 'ngo@gaspzero.local',
    categoryName: 'Dry Goods',
    location: { latitude: 36.7538, longitude: 3.0588, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'rice chickpeas grains',
  },
  {
    title: 'Fresh orange juice — 2L bottles',
    description: 'Freshly pressed orange juice, 2L bottles. No added sugar. Consume within 48h of opening.',
    quantity: 12,
    foodWeightKg: 24,
    specification: { items: ['orange juice'], packaging: '2L bottles', dietary: ['vegan'], allergens: [] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 48),
    urgency: DonationUrgencyValues.MEDIUM,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 36),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'supermarche@gaspzero.local',
    categoryName: 'Beverages',
    location: { latitude: 36.738, longitude: 3.07, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'fresh orange juice bottle',
  },
  {
    title: 'M\'semen & baghrir — breakfast pastries',
    description: 'Traditional Algerian flatbreads: m\'semen (layered) and baghrir (spongy). Made this morning, best consumed today.',
    quantity: 40,
    foodWeightKg: 10,
    specification: { allergens: ['gluten', 'wheat', 'semolina'], dietary: ['vegetarian'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 8),
    urgency: DonationUrgencyValues.HIGH,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'boulangerie@gaspzero.local',
    categoryName: 'Bakery',
    location: { latitude: 36.755, longitude: 3.045, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'msemen flatbread',
  },
  {
    title: 'Lentil soup — donated by mosque',
    description: 'Large pot of hara (lentil soup) prepared for iftar. Approximately 15 liters in sealed containers.',
    quantity: 15,
    foodWeightKg: 22,
    specification: { requiresColdChain: false, allergens: [], dietary: ['vegan'], servingTemperature: 'hot' },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 6),
    urgency: DonationUrgencyValues.HIGH,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'mosque@gaspzero.local',
    categoryName: 'Cooked Meals',
    location: { latitude: 36.75, longitude: 3.06, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'lentil soup',
  },
  {
    title: 'Dates & dried figs — Ramadan surplus',
    description: 'Premium Deglet Nour dates and dried figs from our Ramadan food drive. Excellent nutrition, long shelf life.',
    quantity: 50,
    foodWeightKg: 15,
    specification: { items: ['dates', 'dried figs'], packaging: 'sealed boxes', dietary: ['vegan'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120),
    urgency: DonationUrgencyValues.LOW,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'mosque@gaspzero.local',
    categoryName: 'Fruits & Vegetables',
    location: { latitude: 36.75, longitude: 3.06, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'dates dried figs',
  },
  {
    title: 'Labneh & milk — surplus dairy',
    description: 'Fresh labneh (strained yogurt) in tubs and UHT milk cartons. Stored and transported cold.',
    quantity: 30,
    foodWeightKg: 20,
    specification: { requiresColdChain: true, allergens: ['dairy', 'milk'], storageTemp: '2-4°C', items: ['labneh', 'milk'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 36),
    urgency: DonationUrgencyValues.MEDIUM,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    status: DonationStatusValues.PENDING_APPROVAL,
    donorEmail: 'hopital@gaspzero.local',
    categoryName: 'Dairy',
    location: { latitude: 35.701, longitude: -0.622, city: 'Oran', country: 'Algeria' },
    foodPhotoSearchQuery: 'labneh yogurt milk',
  },
  {
    title: 'Flour, sugar & olive oil — basic staples',
    description: 'Community kitchen surplus: all-purpose flour, granulated sugar, and extra-virgin olive oil. Pantry essentials.',
    quantity: 25,
    foodWeightKg: 60,
    specification: { packaging: 'sealed bags and bottles', allergens: ['gluten', 'wheat'], dietary: ['vegan'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 200),
    urgency: DonationUrgencyValues.LOW,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
    status: DonationStatusValues.DRAFT,
    donorEmail: 'omar@gaspzero.local',
    categoryName: 'Dry Goods',
    location: { latitude: 36.365, longitude: 6.6147, city: 'Constantine', country: 'Algeria' },
    foodPhotoSearchQuery: 'flour sugar olive oil',
  },
  {
    title: 'Coffee & herbal tea set',
    description: 'Assorted coffee beans, ground coffee, and herbal teas (mint, chamomile, vervain). Leftover from a hotel event.',
    quantity: 18,
    foodWeightKg: 9,
    specification: { items: ['coffee beans', 'ground coffee', 'herbal tea'], packaging: 'sealed', dietary: ['vegan'] },
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 150),
    urgency: DonationUrgencyValues.LOW,
    safetyChecklistCompleted: true,
    listingExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    status: DonationStatusValues.PUBLISHED,
    donorEmail: 'hotel@gaspzero.local',
    categoryName: 'Beverages',
    location: { latitude: 36.757, longitude: 3.063, city: 'Algiers', country: 'Algeria' },
    foodPhotoSearchQuery: 'coffee beans herbal tea',
  },
];

const RESERVATIONS: SeedReservation[] = [
  // ── Active (current) reservations ──
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ReservationStatusValues.PENDING, quantity: 5, confirmedAt: null },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', status: ReservationStatusValues.CONFIRMED, quantity: 8, confirmedAt: new Date(Date.now() - 1000 * 60 * 30) },
  { donationTitle: 'Couscous royal — simmered vegetables & lamb', donorEmail: 'nour@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ReservationStatusValues.CONFIRMED, quantity: 3, confirmedAt: new Date(Date.now() - 1000 * 60 * 45) },
  { donationTitle: 'Yogurt cups — assorted flavors', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', status: ReservationStatusValues.CONFIRMED, quantity: 15, confirmedAt: new Date(Date.now() - 1000 * 60 * 20) },
  { donationTitle: 'Mint tea & orange juice — beverage surplus', donorEmail: 'hotel@gaspzero.local', beneficiaryEmail: 'reda@gaspzero.local', status: ReservationStatusValues.PENDING, quantity: 6, confirmedAt: null },
  { donationTitle: 'Croissants & pains au chocolat', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'sara@gaspzero.local', status: ReservationStatusValues.PENDING, quantity: 10, confirmedAt: null },
  { donationTitle: 'Chorba soup — large batch', donorEmail: 'nour@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', status: ReservationStatusValues.CONFIRMED, quantity: 4, confirmedAt: new Date(Date.now() - 1000 * 60 * 15) },
  { donationTitle: 'Fresh tomatoes, peppers & zucchini', donorEmail: 'epicerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ReservationStatusValues.CONFIRMED, quantity: 10, confirmedAt: new Date(Date.now() - 1000 * 60 * 60) },
  { donationTitle: 'Fresh orange juice — 2L bottles', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', status: ReservationStatusValues.PENDING, quantity: 4, confirmedAt: null },
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', status: ReservationStatusValues.PENDING, quantity: 12, confirmedAt: null },
  // ── Historical COMPLETED reservations (for reputation & leaderboard) ──
  { donationTitle: 'Seasonal fruit crate — oranges, apples & bananas', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 5, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 8, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 48) },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 10, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45) },
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 10, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'sara@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 15, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4) },
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 12, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'reda@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 8, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10) },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 20, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 15, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6) },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 6, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8) },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 8, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12) },
  { donationTitle: 'Coffee & herbal tea set', donorEmail: 'hotel@gaspzero.local', beneficiaryEmail: 'medecins@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 10, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 15, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20) },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 10, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 12, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15) },
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', status: ReservationStatusValues.COMPLETED, quantity: 8, confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18) },
];

const CONVERSATIONS: SeedConversation[] = [
  // Active conversations
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ConversationStatusValues.LOCKED, lastMessage: 'I\'d like to reserve 5 baguettes please.' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', status: ConversationStatusValues.ACTIVE, lastMessage: 'Pickup confirmed for 2 PM at the bakery.' },
  { donationTitle: 'Couscous royal — simmered vegetables & lamb', donorEmail: 'nour@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ConversationStatusValues.ACTIVE, lastMessage: 'On my way! ETA 15 minutes.' },
  { donationTitle: 'Yogurt cups — assorted flavors', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', status: ConversationStatusValues.ACTIVE, lastMessage: 'Can we arrange cold-chain transport?' },
  { donationTitle: 'Mint tea & orange juice — beverage surplus', donorEmail: 'hotel@gaspzero.local', beneficiaryEmail: 'reda@gaspzero.local', status: ConversationStatusValues.LOCKED, lastMessage: 'I can pick these up this afternoon.' },
  { donationTitle: 'Chorba soup — large batch', donorEmail: 'nour@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', status: ConversationStatusValues.ACTIVE, lastMessage: 'How many containers should I bring?' },
  { donationTitle: 'Fresh tomatoes, peppers & zucchini', donorEmail: 'epicerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ConversationStatusValues.ACTIVE, lastMessage: 'Great, I\'ll be there in 30 minutes.' },
  { donationTitle: 'Fresh orange juice — 2L bottles', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', status: ConversationStatusValues.LOCKED, lastMessage: 'Can I reserve 4 bottles?' },
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', status: ConversationStatusValues.LOCKED, lastMessage: '12 portions would be perfect.' },
  // Archived conversations (completed reservations)
  { donationTitle: 'Seasonal fruit crate — oranges, apples & bananas', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'All picked up, thanks!' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Pickup completed. Thank you!' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Delivered to the community center, all good!' },
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Cheese picked up, everyone loved it!' },
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'sara@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Delivery confirmed. Great quality!' },
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'All 12 kits distributed to families. Thank you!' },
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'reda@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Picked up 8 kits, heading to the shelter.' },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'All distributed to families in need. Barakallah!' },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Picked up 15 boxes for the dorm. Jazakallah!' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Soup was delicious, everyone enjoyed it. Thank you!' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Distributed to 8 families. Wonderful initiative!' },
  { donationTitle: 'Coffee & herbal tea set', donorEmail: 'hotel@gaspzero.local', beneficiaryEmail: 'medecins@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'The tea and coffee were a hit at the health center. Thanks!' },
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'All 15 portions delivered to the food bank successfully.' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: '10 baguettes delivered to the shelter. Thank you!' },
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'Picked up 12 tubs of labneh. Cold chain maintained.' },
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', status: ConversationStatusValues.ARCHIVED, lastMessage: 'All delivered safely. Families appreciated it!' },
];

const MESSAGES: SeedMessage[] = [
  // Fresh baguettes — karim (active)
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'Hi! I\'d like to reserve some baguettes for our community center.' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'boulangerie@gaspzero.local', content: 'Of course! How many do you need?' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: '5 would be great. Can I pick them up around noon?' },
  // Fresh baguettes — salima (active)
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', senderEmail: 'salima@gaspzero.local', content: 'Hello! I\'d like 8 baguettes for the food bank.' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', senderEmail: 'boulangerie@gaspzero.local', content: 'Sure thing! Pickup confirmed for 2 PM at the bakery.' },
  // Couscous — karim (active)
  { donationTitle: 'Couscous royal — simmered vegetables & lamb', donorEmail: 'nour@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'This looks amazing! Can I reserve 3 portions?' },
  { donationTitle: 'Couscous royal — simmered vegetables & lamb', donorEmail: 'nour@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'nour@gaspzero.local', content: 'Absolutely! It\'s still warm. On my way! ETA 15 minutes.' },
  // Yogurt — salima (active)
  { donationTitle: 'Yogurt cups — assorted flavors', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', senderEmail: 'salima@gaspzero.local', content: 'Can we arrange cold-chain transport for the yogurt cups?' },
  { donationTitle: 'Yogurt cups — assorted flavors', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', senderEmail: 'hopital@gaspzero.local', content: 'Yes, they\'re currently at 4°C. Bring a cooler bag if you can.' },
  // Mint tea — reda (active)
  { donationTitle: 'Mint tea & orange juice — beverage surplus', donorEmail: 'hotel@gaspzero.local', beneficiaryEmail: 'reda@gaspzero.local', senderEmail: 'reda@gaspzero.local', content: 'I can pick these up this afternoon. Where are you located?' },
  // Chorba — leila (active)
  { donationTitle: 'Chorba soup — large batch', donorEmail: 'nour@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', senderEmail: 'leila@gaspzero.local', content: 'How many containers should I bring for the chorba?' },
  { donationTitle: 'Chorba soup — large batch', donorEmail: 'nour@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', senderEmail: 'nour@gaspzero.local', content: 'I have 4 sealed containers ready. Bring a bag just in case.' },
  // Tomatoes — karim (active)
  { donationTitle: 'Fresh tomatoes, peppers & zucchini', donorEmail: 'epicerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'Can I reserve 10 portions of the vegetables?' },
  { donationTitle: 'Fresh tomatoes, peppers & zucchini', donorEmail: 'epicerie@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'epicerie@gaspzero.local', content: 'Great, I\'ll be there in 30 minutes.' },
  // Orange juice — fatima (active)
  { donationTitle: 'Fresh orange juice — 2L bottles', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'fatima@gaspzero.local', content: 'Can I reserve 4 bottles of the orange juice?' },
  // Msemen — yassine (active)
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', senderEmail: 'yassine@gaspzero.local', content: '12 portions would be perfect for the student dorm. Reserve for me?' },

  // ── Archived conversations (completed) ──
  // Seasonal fruit — fatima (completed)
  { donationTitle: 'Seasonal fruit crate — oranges, apples & bananas', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'fatima@gaspzero.local', content: 'I\'m at the entrance of the supermarket. Where should I pick up?' },
  { donationTitle: 'Seasonal fruit crate — oranges, apples & bananas', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'supermarche@gaspzero.local', content: 'Side door, loading dock. The crate is labeled "Gasp Zero".' },
  { donationTitle: 'Seasonal fruit crate — oranges, apples & bananas', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'fatima@gaspzero.local', content: 'All picked up, thanks!' },
  // Semolina — yassine (completed)
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', senderEmail: 'yassine@gaspzero.local', content: 'I can pick these up after my afternoon class.' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', senderEmail: 'ngo@gaspzero.local', content: 'Great, we\'re open until 6 PM today. See you then!' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', senderEmail: 'yassine@gaspzero.local', content: 'Pickup completed. Thank you!' },
  // Semolina — leila (completed)
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', senderEmail: 'leila@gaspzero.local', content: 'Can I get 10 portions for the community center?' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', senderEmail: 'ngo@gaspzero.local', content: 'Absolutely, they\'re packed and ready for pickup.' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', senderEmail: 'leila@gaspzero.local', content: 'Delivered to the community center, all good!' },
  // Cheese — karim (completed)
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'I\'ll take 10 packs of cheese for the shelter.' },
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'supermarche@gaspzero.local', content: 'They\'re at the fridge section. Ask for the "Gasp Zero" basket.' },
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'Cheese picked up, everyone loved it!' },
  // Cheese — sara (completed)
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'sara@gaspzero.local', senderEmail: 'sara@gaspzero.local', content: 'Need 15 packs for the nutrition program. Possible?' },
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'sara@gaspzero.local', senderEmail: 'supermarche@gaspzero.local', content: 'Yes! All 15 are yours. Pick up anytime before closing.' },
  { donationTitle: 'Cheese slices — assorted', donorEmail: 'supermarche@gaspzero.local', beneficiaryEmail: 'sara@gaspzero.local', senderEmail: 'sara@gaspzero.local', content: 'Delivery confirmed. Great quality!' },
  // Rice — fatima (completed)
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'fatima@gaspzero.local', content: 'We need 12 food kits for the families in our neighborhood.' },
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'ngo@gaspzero.local', content: 'They\'re ready at our warehouse. Open weekdays 9-5.' },
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'fatima@gaspzero.local', content: 'All 12 kits distributed to families. Thank you!' },
  // Rice — reda (completed)
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'reda@gaspzero.local', senderEmail: 'reda@gaspzero.local', content: 'I can transport 8 kits in my van to the shelter.' },
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'reda@gaspzero.local', senderEmail: 'ngo@gaspzero.local', content: 'Perfect. Call me when you arrive.' },
  { donationTitle: 'Rice & chickpeas — emergency food kit', donorEmail: 'ngo@gaspzero.local', beneficiaryEmail: 'reda@gaspzero.local', senderEmail: 'reda@gaspzero.local', content: 'Picked up 8 kits, heading to the shelter.' },
  // Dates — karim (completed)
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'We\'d love 20 boxes of dates for the community iftar.' },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'mosque@gaspzero.local', content: 'Mashallah! We have plenty. Come pick them up after Asr prayer.' },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'All distributed to families in need. Barakallah!' },
  // Dates — yassine (completed)
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', senderEmail: 'yassine@gaspzero.local', content: 'Can the student dorm get 15 boxes of dates?' },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', senderEmail: 'mosque@gaspzero.local', content: 'Yes, they\'re packed and ready. Stop by the mosque office.' },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'yassine@gaspzero.local', senderEmail: 'yassine@gaspzero.local', content: 'Picked up 15 boxes for the dorm. Jazakallah!' },
  // Lentil — salima (completed)
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', senderEmail: 'salima@gaspzero.local', content: 'How many containers of lentil soup are available?' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', senderEmail: 'mosque@gaspzero.local', content: 'We have 6 containers ready. Still warm!' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'salima@gaspzero.local', senderEmail: 'salima@gaspzero.local', content: 'Soup was delicious, everyone enjoyed it. Thank you!' },
  // Lentil — ngo (completed)
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', senderEmail: 'ngo@gaspzero.local', content: 'Can we collect 8 containers for distribution?' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', senderEmail: 'mosque@gaspzero.local', content: 'Of course, we\'ll set them aside for you.' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', senderEmail: 'ngo@gaspzero.local', content: 'Distributed to 8 families. Wonderful initiative!' },
  // Coffee — medecins (completed)
  { donationTitle: 'Coffee & herbal tea set', donorEmail: 'hotel@gaspzero.local', beneficiaryEmail: 'medecins@gaspzero.local', senderEmail: 'medecins@gaspzero.local', content: 'We\'d love 10 sets for the health center\'s waiting room.' },
  { donationTitle: 'Coffee & herbal tea set', donorEmail: 'hotel@gaspzero.local', beneficiaryEmail: 'medecins@gaspzero.local', senderEmail: 'hotel@gaspzero.local', content: 'Packed and waiting at reception. Mention Gasp Zero at the desk.' },
  { donationTitle: 'Coffee & herbal tea set', donorEmail: 'hotel@gaspzero.local', beneficiaryEmail: 'medecins@gaspzero.local', senderEmail: 'medecins@gaspzero.local', content: 'The tea and coffee were a hit at the health center. Thanks!' },
  // Msemen — fatima (completed)
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'fatima@gaspzero.local', content: 'Could we get 15 portions for the food bank breakfast?' },
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'boulangerie@gaspzero.local', content: 'Freshly made this morning. They\'ll be ready at 7 AM.' },
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'fatima@gaspzero.local', senderEmail: 'fatima@gaspzero.local', content: 'All 15 portions delivered to the food bank successfully.' },
  // Baguettes — ngo (completed)
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', senderEmail: 'ngo@gaspzero.local', content: 'We need 10 baguettes for the shelter families.' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', senderEmail: 'boulangerie@gaspzero.local', content: 'They\'ll be ready after the morning bake. See you at 11.' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', beneficiaryEmail: 'ngo@gaspzero.local', senderEmail: 'ngo@gaspzero.local', content: '10 baguettes delivered to the shelter. Thank you!' },
  // Labneh — karim (completed)
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'Can we collect 12 tubs of labneh for the community?' },
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'hopital@gaspzero.local', content: 'Yes, they\'re at the cafeteria fridge. Bring ID.' },
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'karim@gaspzero.local', senderEmail: 'karim@gaspzero.local', content: 'Picked up 12 tubs of labneh. Cold chain maintained.' },
  // Labneh — leila (completed)
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', senderEmail: 'leila@gaspzero.local', content: 'We can use 8 tubs for the school lunch program.' },
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', senderEmail: 'hopital@gaspzero.local', content: 'Perfect. They expire tomorrow so please pick up today.' },
  { donationTitle: 'Labneh & milk — surplus dairy', donorEmail: 'hopital@gaspzero.local', beneficiaryEmail: 'leila@gaspzero.local', senderEmail: 'leila@gaspzero.local', content: 'All delivered safely. Families appreciated it!' },
];

const REPORTS: SeedReport[] = [
  {
    targetType: ReportTargetTypeValues.DONATION,
    targetDonationTitle: 'Chorba soup — large batch',
    targetDonationOwnerEmail: 'nour@gaspzero.local',
    reporterEmail: 'sara@gaspzero.local',
    reason: 'Missing cold-chain details',
    description: 'The chorba is described as hot food but safety checklist is not marked complete. Please verify.',
    status: ReportStatusValues.OPEN,
  },
  {
    targetType: ReportTargetTypeValues.DONATION,
    targetDonationTitle: 'Yogurt cups — assorted flavors',
    targetDonationOwnerEmail: 'hopital@gaspzero.local',
    reporterEmail: 'karim@gaspzero.local',
    reason: 'Expiry too close',
    description: 'The yogurt expires tomorrow — cutting it very close for safe consumption.',
    status: ReportStatusValues.UNDER_REVIEW,
    reviewedByEmail: 'admin@gaspzero.local',
  },
  {
    targetType: ReportTargetTypeValues.DONATION,
    targetDonationTitle: 'Fresh baguettes — this morning\'s batch',
    targetDonationOwnerEmail: 'boulangerie@gaspzero.local',
    reporterEmail: 'ngo@gaspzero.local',
    reason: 'Misleading quantity',
    description: 'The weight seems off for the stated number of baguettes.',
    status: ReportStatusValues.RESOLVED,
    reviewedByEmail: 'admin@gaspzero.local',
  },
  {
    targetType: ReportTargetTypeValues.USER,
    targetUserEmail: 'omar@gaspzero.local',
    reporterEmail: 'sara@gaspzero.local',
    reason: 'Suspicious incomplete profile',
    description: 'This user has no verified information and a very low reputation score.',
    status: ReportStatusValues.OPEN,
  },
  {
    targetType: ReportTargetTypeValues.USER,
    targetUserEmail: 'leila@gaspzero.local',
    reporterEmail: 'reda@gaspzero.local',
    reason: 'No-show on confirmed reservation',
    description: 'User confirmed a reservation but never showed up to pick up the items.',
    status: ReportStatusValues.UNDER_REVIEW,
    reviewedByEmail: 'admin@gaspzero.local',
  },
];

const BADGES: SeedBadge[] = [
  { code: 'FIRST_DONATION_COMPLETED', name: 'First Donation', description: 'Completed your first donation handover. Welcome to the community!', sortOrder: 10, isActive: true },
  { code: 'FIRST_PICKUP_COMPLETED', name: 'First Pickup', description: 'Picked up your first donation as a beneficiary. Great start!', sortOrder: 20, isActive: true },
  { code: 'FIVE_COMPLETIONS', name: 'Community Helper', description: 'Completed five donation initiatives. You\'re making a difference!', sortOrder: 30, isActive: true },
  { code: 'TEN_DONATIONS', name: 'Generous Donor', description: 'Donated food ten times. Your generosity keeps the community fed.', sortOrder: 40, isActive: true },
  { code: 'FOOD_SAVER', name: 'Food Saver', description: 'Your reputation score exceeded 500. You\'re a trusted member!', sortOrder: 50, isActive: true },
  { code: 'NIGHT_RESCUER', name: 'Night Rescuer', description: 'Completed a donation handover after 9 PM. Night owls save food too!', sortOrder: 60, isActive: true },
  { code: 'STREAK_MASTER', name: 'Streak Master', description: 'Donated at least once per week for four consecutive weeks.', sortOrder: 70, isActive: true },
  { code: 'SAFETY_FIRST', name: 'Safety First', description: 'Completed the food safety checklist on 10 donations in a row.', sortOrder: 80, isActive: true },
];

const ACHIEVEMENTS: SeedAchievement[] = [
  { userEmail: 'karim@gaspzero.local', badgeCode: 'FIRST_DONATION_COMPLETED', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
  { userEmail: 'karim@gaspzero.local', badgeCode: 'FIVE_COMPLETIONS', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
  { userEmail: 'karim@gaspzero.local', badgeCode: 'TEN_DONATIONS', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
  { userEmail: 'salima@gaspzero.local', badgeCode: 'FIRST_PICKUP_COMPLETED', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
  { userEmail: 'salima@gaspzero.local', badgeCode: 'FOOD_SAVER', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
  { userEmail: 'nour@gaspzero.local', badgeCode: 'FIRST_DONATION_COMPLETED', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20) },
  { userEmail: 'nour@gaspzero.local', badgeCode: 'NIGHT_RESCUER', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) },
  { userEmail: 'ngo@gaspzero.local', badgeCode: 'FIVE_COMPLETIONS', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10) },
  { userEmail: 'ngo@gaspzero.local', badgeCode: 'TEN_DONATIONS', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1) },
  { userEmail: 'ngo@gaspzero.local', badgeCode: 'SAFETY_FIRST', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1) },
  { userEmail: 'fatima@gaspzero.local', badgeCode: 'FIRST_PICKUP_COMPLETED', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12) },
  { userEmail: 'supermarche@gaspzero.local', badgeCode: 'FIRST_DONATION_COMPLETED', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25) },
  { userEmail: 'boulangerie@gaspzero.local', badgeCode: 'STREAK_MASTER', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4) },
  { userEmail: 'boulangerie@gaspzero.local', badgeCode: 'SAFETY_FIRST', awardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
];

const DONATION_LIKES: Array<{ donationTitle: string; donorEmail: string; likerEmail: string }> = [
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', likerEmail: 'karim@gaspzero.local' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', likerEmail: 'salima@gaspzero.local' },
  { donationTitle: 'Fresh baguettes — this morning\'s batch', donorEmail: 'boulangerie@gaspzero.local', likerEmail: 'fatima@gaspzero.local' },
  { donationTitle: 'Couscous royal — simmered vegetables & lamb', donorEmail: 'nour@gaspzero.local', likerEmail: 'karim@gaspzero.local' },
  { donationTitle: 'Couscous royal — simmered vegetables & lamb', donorEmail: 'nour@gaspzero.local', likerEmail: 'yassine@gaspzero.local' },
  { donationTitle: 'Seasonal fruit crate — oranges, apples & bananas', donorEmail: 'supermarche@gaspzero.local', likerEmail: 'salima@gaspzero.local' },
  { donationTitle: 'Seasonal fruit crate — oranges, apples & bananas', donorEmail: 'supermarche@gaspzero.local', likerEmail: 'fatima@gaspzero.local' },
  { donationTitle: 'Seasonal fruit crate — oranges, apples & bananas', donorEmail: 'supermarche@gaspzero.local', likerEmail: 'reda@gaspzero.local' },
  { donationTitle: 'Yogurt cups — assorted flavors', donorEmail: 'hopital@gaspzero.local', likerEmail: 'sara@gaspzero.local' },
  { donationTitle: 'Yogurt cups — assorted flavors', donorEmail: 'hopital@gaspzero.local', likerEmail: 'leila@gaspzero.local' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', likerEmail: 'yassine@gaspzero.local' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', likerEmail: 'fatima@gaspzero.local' },
  { donationTitle: 'Semolina & pasta — dry goods bundle', donorEmail: 'ngo@gaspzero.local', likerEmail: 'karim@gaspzero.local' },
  { donationTitle: 'Mint tea & orange juice — beverage surplus', donorEmail: 'hotel@gaspzero.local', likerEmail: 'reda@gaspzero.local' },
  { donationTitle: 'Croissants & pains au chocolat', donorEmail: 'boulangerie@gaspzero.local', likerEmail: 'sara@gaspzero.local' },
  { donationTitle: 'Croissants & pains au chocolat', donorEmail: 'boulangerie@gaspzero.local', likerEmail: 'leila@gaspzero.local' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', likerEmail: 'nour@gaspzero.local' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', likerEmail: 'karim@gaspzero.local' },
  { donationTitle: 'Lentil soup — donated by mosque', donorEmail: 'mosque@gaspzero.local', likerEmail: 'salima@gaspzero.local' },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', likerEmail: 'supermarche@gaspzero.local' },
  { donationTitle: 'Dates & dried figs — Ramadan surplus', donorEmail: 'mosque@gaspzero.local', likerEmail: 'yassine@gaspzero.local' },
  { donationTitle: 'Coffee & herbal tea set', donorEmail: 'hotel@gaspzero.local', likerEmail: 'medecins@gaspzero.local' },
  { donationTitle: 'Fresh orange juice — 2L bottles', donorEmail: 'supermarche@gaspzero.local', likerEmail: 'fatima@gaspzero.local' },
  { donationTitle: 'Fresh orange juice — 2L bottles', donorEmail: 'supermarche@gaspzero.local', likerEmail: 'sara@gaspzero.local' },
  { donationTitle: 'M\'semen & baghrir — breakfast pastries', donorEmail: 'boulangerie@gaspzero.local', likerEmail: 'yassine@gaspzero.local' },
];

const TOKENS: Array<{ fcmToken: string; deviceId: string; userEmail: string }> = [
  { fcmToken: 'demo_fcm_admin_01:APA91bHPRgkFLo...AdminToken', deviceId: 'demo-device-admin-01', userEmail: 'admin@gaspzero.local' },
  { fcmToken: 'demo_fcm_karim_01:APA91bHPRgkFLo...KarimToken', deviceId: 'demo-device-karim-01', userEmail: 'karim@gaspzero.local' },
  { fcmToken: 'demo_fcm_salima_01:APA91bHPRgkFLo...SalimaToken', deviceId: 'demo-device-salima-01', userEmail: 'salima@gaspzero.local' },
  { fcmToken: 'demo_fcm_ngo_01:APA91bHPRgkFLo...NgoToken', deviceId: 'demo-device-ngo-01', userEmail: 'ngo@gaspzero.local' },
  { fcmToken: 'demo_fcm_nour_01:APA91bHPRgkFLo...NourToken', deviceId: 'demo-device-nour-01', userEmail: 'nour@gaspzero.local' },
  { fcmToken: 'demo_fcm_yassine_01:APA91bHPRgkFLo...YassineToken', deviceId: 'demo-device-yassine-01', userEmail: 'yassine@gaspzero.local' },
  { fcmToken: 'demo_fcm_boulangerie_01:APA91bHPRgkFLo...BoulangerieToken', deviceId: 'demo-device-boulangerie-01', userEmail: 'boulangerie@gaspzero.local' },
  { fcmToken: 'demo_fcm_supermarche_01:APA91bHPRgkFLo...SupermarcheToken', deviceId: 'demo-device-supermarche-01', userEmail: 'supermarche@gaspzero.local' },
  { fcmToken: 'demo_fcm_fatima_01:APA91bHPRgkFLo...FatimaToken', deviceId: 'demo-device-fatima-01', userEmail: 'fatima@gaspzero.local' },
  { fcmToken: 'demo_fcm_mosque_01:APA91bHPRgkFLo...MosqueToken', deviceId: 'demo-device-mosque-01', userEmail: 'mosque@gaspzero.local' },
];

type NotificationSeed = {
  title: string;
  body: string;
  type: (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
  isRead: boolean;
  receiverEmail: string;
  meta: Record<string, unknown>;
};

function resolveDonationStatusForReservation(resStatus: Reservation['status']): Donation['status'] {
  if (resStatus === ReservationStatusValues.PENDING) return DonationStatusValues.PUBLISHED;
  if (resStatus === ReservationStatusValues.CONFIRMED) return DonationStatusValues.PUBLISHED;
  if (resStatus === ReservationStatusValues.COMPLETED) return DonationStatusValues.COMPLETED;
  return DonationStatusValues.PUBLISHED;
}

async function seedDemo(): Promise<void> {
  console.log('🚀 Starting demo seed...');
  await dataSource.initialize();
  console.log('✅ Database connected');

  console.log('\n📷 Fetching images from Pexels...');
  const [portraitPhotos, foodPhotos, badgePhotos] = await Promise.all([
    searchPortraits(25),
    searchFood(30),
    searchBadgeIcons(8),
  ]);
  console.log(`   Got ${portraitPhotos.length} portraits, ${foodPhotos.length} food photos, ${badgePhotos.length} badge icons`);

  const userRepo = dataSource.getRepository(User);
  const userSettingsRepo = dataSource.getRepository(UserSettings);
  const locationRepo = dataSource.getRepository(Location);
  const attachmentRepo = dataSource.getRepository(Attachment);
  const categoryRepo = dataSource.getRepository(Category);
  const donationRepo = dataSource.getRepository(Donation);
  const donationPhotoRepo = dataSource.getRepository(DonationPhoto);
  const donationLikeRepo = dataSource.getRepository(DonationLike);
  const reservationRepo = dataSource.getRepository(Reservation);
  const conversationRepo = dataSource.getRepository(Conversation);
  const messageRepo = dataSource.getRepository(Message);
  const badgeRepo = dataSource.getRepository(Badge);
  const achievementRepo = dataSource.getRepository(Achievement);
  const notificationRepo = dataSource.getRepository(Notification);
  const reportRepo = dataSource.getRepository(Report);
  const tokenRepo = dataSource.getRepository(Token);
  const reputationLogRepo = dataSource.getRepository(ReputationLog);

  const userIds: Map<string, string> = new Map();
  const userAvatarIds: Map<string, string> = new Map();
  const categoryIds: Map<string, string> = new Map();

  // ─── 1. Categories ────────────────────────────────────────────────────
  console.log('\n📁 Seeding categories...');
  for (const cat of CATEGORIES) {
    const existing = await categoryRepo.findOne({ where: { name: cat.name } });
    if (existing) {
      categoryRepo.merge(existing, { sensitivity: cat.sensitivity, reputationGain: cat.reputationGain });
      await categoryRepo.save(existing);
      categoryIds.set(cat.name, existing.id);
    } else {
      const created = categoryRepo.create(cat);
      const saved = await categoryRepo.save(created);
      categoryIds.set(cat.name, saved.id);
    }
  }
  console.log(`   ${CATEGORIES.length} categories processed`);

  // ─── 2. Users (create/get IDs first, avatars linked afterwards) ──────
  console.log('\n👤 Seeding users...');
  for (let i = 0; i < USERS.length; i++) {
    const seed = USERS[i];
    const existingUser = await userRepo.findOne({ where: { email: seed.email }, relations: { location: true, settings: true } });

    const passwordHash = await generateHash(seed.password);

    const loc = existingUser?.location
      ? locationRepo.merge(existingUser.location, seed.location)
      : locationRepo.create(seed.location);
    const savedLoc = await locationRepo.save(loc);

    if (existingUser) {
      userRepo.merge(existingUser, {
        displayName: seed.displayName,
        description: seed.description,
        role: seed.role,
        reputationScore: seed.reputationScore,
        isVerified: seed.isVerified,
        isFoodSaver: seed.isFoodSaver,
        passwordHash,
        location: savedLoc,
        locationId: savedLoc.id,
      });
      const savedUser = await userRepo.save(existingUser);
      userIds.set(seed.email, savedUser.id);
    } else {
      const user = userRepo.create({
        email: seed.email,
        displayName: seed.displayName,
        description: seed.description,
        role: seed.role,
        reputationScore: seed.reputationScore,
        isVerified: seed.isVerified,
        isFoodSaver: seed.isFoodSaver,
        passwordHash,
        location: savedLoc,
        locationId: savedLoc.id,
      });
      const savedUser = await userRepo.save(user);
      userIds.set(seed.email, savedUser.id);

      // create settings manually if not auto-created
      const existingSettings = await userSettingsRepo.findOne({ where: { userId: savedUser.id } });
      if (!existingSettings) {
        const settings = userSettingsRepo.create({ userId: savedUser.id });
        await userSettingsRepo.save(settings);
      }
    }
  }
  console.log(`   ${USERS.length} users processed`);

  // ─── 2b. Avatar attachments ─────────────────────────────────────────
  console.log('\n🖼️ Seeding avatar attachments...');
  for (let i = 0; i < USERS.length; i++) {
    const seed = USERS[i];
    const userId = userIds.get(seed.email);
    if (!userId) continue;

    const photo = portraitPhotos[i % portraitPhotos.length];
    if (!photo) continue;

    const fileName = `avatar-${seed.email.replace('@gaspzero.local', '')}.jpg`;

    // Try to find existing avatar attachment by fileName or by user's current avatarAttachmentId
    const currentUser = await userRepo.findOne({ where: { email: seed.email } });
    let existingAtt: Attachment | null = null;
    if (currentUser?.avatarAttachmentId) {
      existingAtt = await attachmentRepo.findOne({ where: { id: currentUser.avatarAttachmentId } });
    }
    if (!existingAtt) {
      existingAtt = await attachmentRepo.findOne({ where: { fileName, uploadedById: userId } });
    }

    if (existingAtt) {
      attachmentRepo.merge(existingAtt, { url: photo.url, fileType: 'image/jpeg', fileSize: 0, uploadStatus: UploadStatusValues.COMPLETED, uploadedById: userId });
      await attachmentRepo.save(existingAtt);
      userAvatarIds.set(seed.email, existingAtt.id);
      // Link avatar to user if not already linked
      if (!currentUser?.avatarAttachmentId || currentUser.avatarAttachmentId !== existingAtt.id) {
        await userRepo.update(userId, { avatarAttachmentId: existingAtt.id });
      }
    } else {
      const att = attachmentRepo.create({
        fileName,
        fileType: 'image/jpeg',
        fileSize: 0,
        url: photo.url,
        uploadStatus: UploadStatusValues.COMPLETED,
        uploadedById: userId,
      });
      const savedAtt = await attachmentRepo.save(att);
      userAvatarIds.set(seed.email, savedAtt.id);
      await userRepo.update(userId, { avatarAttachmentId: savedAtt.id });
    }
  }
  console.log(`   ${USERS.length} avatar attachments processed`);

  // ─── 3. Food-photo attachments ────────────────────────────────────────
  console.log('\n🍜 Seeding food-photo attachments...');
  const foodAttachments: Map<string, string> = new Map(); // "donorEmail::idx" -> attachmentId
  for (let i = 0; i < DONATIONS.length; i++) {
    const d = DONATIONS[i];
    const donorId = userIds.get(d.donorEmail);
    if (!donorId) continue;

    const photoCount = d.status === DonationStatusValues.DRAFT ? 0 : (i % 3 === 0 ? 3 : 2);
    for (let p = 0; p < photoCount; p++) {
      const photoIdx = (i * 3 + p) % foodPhotos.length;
      const photo = foodPhotos[photoIdx] ?? null;
      const label = d.foodPhotoSearchQuery ?? `food-${i}`;
      const fileName = `donation-${label.replace(/\s+/g, '-').toLowerCase()}-${p + 1}.jpg`;

      const existing = await attachmentRepo.findOne({ where: { fileName, uploadedById: donorId } });
      if (existing) {
        if (photo) {
          attachmentRepo.merge(existing, { url: photo.url });
        }
        await attachmentRepo.save(existing);
        foodAttachments.set(`${d.donorEmail}::${i}::${p}`, existing.id);
      } else {
        const att = attachmentRepo.create({
          fileName,
          fileType: 'image/jpeg',
          fileSize: 0,
          url: photo?.url ?? PLACEHOLDER_URL,
          uploadStatus: UploadStatusValues.COMPLETED,
          uploadedById: donorId,
        });
        const saved = await attachmentRepo.save(att);
        foodAttachments.set(`${d.donorEmail}::${i}::${p}`, saved.id);
      }
    }
  }
  console.log(`   Food-photo attachments created`);

  // ─── 4. Badge-icon attachments ────────────────────────────────────────
  console.log('\n🏅 Seeding badge-icon attachments...');
  const badgeAttachmentIds: Map<string, string> = new Map();
  for (let i = 0; i < BADGES.length; i++) {
    const photo = badgePhotos[i % Math.max(badgePhotos.length, 1)];
    const fileName = `badge-icon-${BADGES[i].code.toLowerCase()}.png`;

    const existing = await attachmentRepo.findOne({ where: { fileName } });
    if (existing) {
      if (photo) {
        attachmentRepo.merge(existing, { url: photo.url, fileType: 'image/png' });
        await attachmentRepo.save(existing);
        badgeAttachmentIds.set(BADGES[i].code, existing.id);
      } else {
        badgeAttachmentIds.set(BADGES[i].code, existing.id);
      }
    } else {
      const att = attachmentRepo.create({
        fileName,
        fileType: 'image/png',
        fileSize: 0,
        url: photo?.url ?? PLACEHOLDER_URL,
        uploadStatus: UploadStatusValues.COMPLETED,
        uploadedById: userIds.get('admin@gaspzero.local')!,
      });
      const saved = await attachmentRepo.save(att);
      badgeAttachmentIds.set(BADGES[i].code, saved.id);
    }
  }

  // ─── 5. Donations + DonationPhotos ────────────────────────────────────
  console.log('\n🎁 Seeding donations...');
  const donationIds: Map<string, string> = new Map(); // "donorEmail::title" -> id
  for (let i = 0; i < DONATIONS.length; i++) {
    const d = DONATIONS[i];
    const donorId = userIds.get(d.donorEmail);
    const catId = categoryIds.get(d.categoryName);
    if (!donorId || !catId) {
      console.warn(`   ⚠ Skipping "${d.title}": donor or category not found`);
      continue;
    }

    let locationId: string | undefined;
    if (d.location) {
      const loc = locationRepo.create(d.location);
      const savedLoc = await locationRepo.save(loc);
      locationId = savedLoc.id;
    }

    const publishedAt = d.status === DonationStatusValues.PUBLISHED ||
      d.status === DonationStatusValues.RESERVED ||
      d.status === DonationStatusValues.COMPLETED
      ? new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 3)
      : undefined;

    const approvedAt = d.status === DonationStatusValues.PUBLISHED ||
      d.status === DonationStatusValues.RESERVED ||
      d.status === DonationStatusValues.COMPLETED
      ? new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24)
      : undefined;

    const adminId = userIds.get('admin@gaspzero.local');

    const existing = await donationRepo.findOne({ where: { userId: donorId, title: d.title } });
    let donationId: string;

    if (existing) {
      const merged = donationRepo.merge(existing, {
        description: d.description,
        quantity: d.quantity,
        foodWeightKg: d.foodWeightKg,
        specification: d.specification,
        expiryDate: d.expiryDate,
        urgency: d.urgency,
        safetyChecklistCompleted: d.safetyChecklistCompleted,
        listingExpiresAt: d.listingExpiresAt,
        publishedAt,
        approvedAt,
        approvedById: approvedAt ? adminId : undefined,
        status: d.status,
        categoryId: catId,
        locationId,
      });
      const savedDonation = await donationRepo.save(merged);
      donationId = savedDonation.id;

      // remove old photos
      await donationPhotoRepo.delete({ donationId });
    } else {
      const created = donationRepo.create({
        title: d.title,
        description: d.description,
        quantity: d.quantity,
        foodWeightKg: d.foodWeightKg,
        specification: d.specification,
        expiryDate: d.expiryDate,
        urgency: d.urgency,
        safetyChecklistCompleted: d.safetyChecklistCompleted,
        listingExpiresAt: d.listingExpiresAt,
        publishedAt,
        approvedAt,
        approvedById: approvedAt ? adminId : undefined,
        status: d.status,
        userId: donorId,
        categoryId: catId,
        locationId,
      });
      const savedDonation = await donationRepo.save(created);
      donationId = savedDonation.id;
    }

    donationIds.set(`${d.donorEmail}::${d.title}`, donationId);

    // link food photos
    const photoCount = d.status === DonationStatusValues.DRAFT ? 0 : (i % 3 === 0 ? 3 : 2);
    for (let p = 0; p < photoCount; p++) {
      const attId = foodAttachments.get(`${d.donorEmail}::${i}::${p}`);
      if (attId) {
        const dp = donationPhotoRepo.create({
          donationId,
          attachmentId: attId,
          isMain: p === 0,
        });
        await donationPhotoRepo.save(dp);
      }
    }
  }
  console.log(`   ${DONATIONS.length} donations processed`);

  // ─── 6. Donation Likes ────────────────────────────────────────────────
  console.log('\n❤️ Seeding donation likes...');
  let likesCreated = 0;
  for (const like of DONATION_LIKES) {
    const likerId = userIds.get(like.likerEmail);
    const donationId = donationIds.get(`${like.donorEmail}::${like.donationTitle}`);
    if (!likerId || !donationId) continue;

    const existing = await donationLikeRepo.findOne({ where: { userId: likerId, donationId } });
    if (existing) continue;

    await donationLikeRepo.save(donationLikeRepo.create({ userId: likerId, donationId }));
    likesCreated++;
  }
  console.log(`   ${likesCreated} likes created`);

  // ─── 7. Reservations ──────────────────────────────────────────────────
  console.log('\n📋 Seeding reservations...');
  for (const r of RESERVATIONS) {
    const donorId = userIds.get(r.donorEmail);
    const beneficiaryId = userIds.get(r.beneficiaryEmail);
    const donationId = donationIds.get(`${r.donorEmail}::${r.donationTitle}`);
    if (!donorId || !beneficiaryId || !donationId) {
      console.warn(`   ⚠ Skipping reservation for "${r.donationTitle}": missing refs`);
      continue;
    }

    const existing = await reservationRepo.findOne({ where: { donationId, beneficiaryId } });
    if (existing) {
      reservationRepo.merge(existing, { status: r.status, confirmedAt: r.confirmedAt ?? null, quantity: r.quantity });
      await reservationRepo.save(existing);
    } else {
      await reservationRepo.save(reservationRepo.create({
        donationId,
        beneficiaryId,
        status: r.status,
        confirmedAt: r.confirmedAt ?? null,
        quantity: r.quantity,
      }));
    }

    // update donation status
    const newStatus = resolveDonationStatusForReservation(r.status);
    await donationRepo.update(donationId, { status: newStatus });
  }
  console.log(`   ${RESERVATIONS.length} reservations processed`);

  // ─── 8. Conversations + Messages ──────────────────────────────────────
  console.log('\n💬 Seeding conversations and messages...');
  for (const c of CONVERSATIONS) {
    const donorId = userIds.get(c.donorEmail);
    const beneficiaryId = userIds.get(c.beneficiaryEmail);
    const donationId = donationIds.get(`${c.donorEmail}::${c.donationTitle}`);
    if (!donorId || !beneficiaryId || !donationId) continue;

    const reservation = await reservationRepo.findOne({ where: { donationId, beneficiaryId } });
    if (!reservation) continue;

    const existing = await conversationRepo.findOne({ where: { reservationId: reservation.id } });
    let conversationId: string;

    if (existing) {
      conversationRepo.merge(existing, { status: c.status, lastMessage: c.lastMessage ?? null });
      await conversationRepo.save(existing);
      conversationId = existing.id;
    } else {
      const conv = conversationRepo.create({
        reservationId: reservation.id,
        status: c.status,
        lastMessage: c.lastMessage ?? null,
      });
      const saved = await conversationRepo.save(conv);
      conversationId = saved.id;
    }

    // seed messages for this conversation
    const convMessages = MESSAGES.filter(
      m => m.donationTitle === c.donationTitle && m.donorEmail === c.donorEmail && m.beneficiaryEmail === c.beneficiaryEmail,
    );
    for (const m of convMessages) {
      const senderId = userIds.get(m.senderEmail);
      if (!senderId) continue;

      const existingMsg = await messageRepo.findOne({ where: { conversationId, senderId, content: m.content } });
      if (existingMsg) continue;

      await messageRepo.save(messageRepo.create({
        conversationId,
        senderId,
        content: m.content,
      }));
    }
  }
  console.log(`   ${CONVERSATIONS.length} conversations processed`);

  // ─── 9. Badges ────────────────────────────────────────────────────────
  console.log('\n🏅 Seeding badges...');
  const badgeIds: Map<string, string> = new Map();
  for (const b of BADGES) {
    const iconAttachmentId = badgeAttachmentIds.get(b.code) ?? null;

    const existing = await badgeRepo.findOne({ where: { code: b.code } });
    if (existing) {
      badgeRepo.merge(existing, { name: b.name, description: b.description, sortOrder: b.sortOrder, isActive: b.isActive, iconAttachmentId });
      await badgeRepo.save(existing);
      badgeIds.set(b.code, existing.id);
    } else {
      const created = badgeRepo.create({ code: b.code, name: b.name, description: b.description, sortOrder: b.sortOrder, isActive: b.isActive, iconAttachmentId });
      const saved = await badgeRepo.save(created);
      badgeIds.set(b.code, saved.id);
    }
  }
  console.log(`   ${BADGES.length} badges processed`);

  // ─── 10. Achievements ─────────────────────────────────────────────────
  console.log('\n🏆 Seeding achievements...');
  let achievementsCreated = 0;
  for (const a of ACHIEVEMENTS) {
    const userId = userIds.get(a.userEmail);
    const badgeId = badgeIds.get(a.badgeCode);
    if (!userId || !badgeId) continue;

    const existing = await achievementRepo.findOne({ where: { userId, badgeId } });
    if (existing) {
      achievementRepo.merge(existing, { awardedAt: a.awardedAt });
      await achievementRepo.save(existing);
      continue;
    }

    await achievementRepo.save(achievementRepo.create({ userId, badgeId, awardedAt: a.awardedAt }));
    achievementsCreated++;
  }
  console.log(`   ${achievementsCreated} achievements created`);

  // ─── 11. Notifications ────────────────────────────────────────────────
  console.log('\n🔔 Seeding notifications...');
  const notificationSeeds: NotificationSeed[] = [
    { title: 'Nour Hamdi', body: 'Your couscous is ready for pickup!', type: NOTIFICATION_TYPE.CHAT_MESSAGE, isRead: false, receiverEmail: 'karim@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'Donation reserved', body: 'Salima reserved 8 of Fresh baguettes.', type: NOTIFICATION_TYPE.RESERVATION_ALERT, isRead: false, receiverEmail: 'boulangerie@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'New donation near you', body: 'Seasonal fruit crate is available in Algiers.', type: NOTIFICATION_TYPE.NEW_POST, isRead: false, receiverEmail: 'fatima@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'Reservation confirmed', body: 'Your reservation for yogurt cups has been confirmed.', type: NOTIFICATION_TYPE.RESERVATION_ALERT, isRead: true, receiverEmail: 'salima@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'New report filed', body: 'A donation was flagged for missing cold-chain details.', type: NOTIFICATION_TYPE.REPORT_ALERT, isRead: false, receiverEmail: 'admin@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'Account verified', body: 'Your organization account has been verified by an administrator.', type: NOTIFICATION_TYPE.ACCOUNT_STATUS_ALERT, isRead: true, receiverEmail: 'ngo@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'Achievement unlocked!', body: 'You earned the "Community Helper" badge. Keep it up!', type: NOTIFICATION_TYPE.NEW_ACHIEVEMENT, isRead: false, receiverEmail: 'karim@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'Reservation cancelled', body: 'A reservation for mint tea was cancelled.', type: NOTIFICATION_TYPE.RESERVATION_CANCELLED, isRead: false, receiverEmail: 'hotel@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'Donation expiring soon', body: 'Your Chorba soup listing expires in 4 hours.', type: NOTIFICATION_TYPE.NEW_POST, isRead: false, receiverEmail: 'nour@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
    { title: 'Welcome to Gasp Zero!', body: 'Your account has been set up. Start donating or reserving food now.', type: NOTIFICATION_TYPE.TEST, isRead: true, receiverEmail: 'admin@gaspzero.local', meta: { action: NOTIFICATION_ACTION.DEFAULT_OPEN } },
  ];

  for (const n of notificationSeeds) {
    const receiverId = userIds.get(n.receiverEmail);
    if (!receiverId) continue;

    const existing = await notificationRepo.findOne({ where: { title: n.title, receiverId, type: n.type } });
    if (existing) {
      notificationRepo.merge(existing, { body: n.body, isRead: n.isRead, meta: n.meta });
      await notificationRepo.save(existing);
      continue;
    }

    await notificationRepo.save(notificationRepo.create({
      title: n.title,
      body: n.body,
      type: n.type,
      isRead: n.isRead,
      meta: n.meta,
      receiverId,
    }));
  }
  console.log(`   ${notificationSeeds.length} notifications processed`);

  // ─── 12. Reports ──────────────────────────────────────────────────────
  console.log('\n🚨 Seeding reports...');
  for (const r of REPORTS) {
    const reporterId = userIds.get(r.reporterEmail);
    if (!reporterId) continue;

    let targetId: string | null = null;
    if (r.targetType === ReportTargetTypeValues.USER) {
      targetId = userIds.get(r.targetUserEmail!) ?? null;
    } else if (r.targetType === ReportTargetTypeValues.DONATION) {
      targetId = donationIds.get(`${r.targetDonationOwnerEmail}::${r.targetDonationTitle}`) ?? null;
    }
    if (!targetId) continue;

    let reviewedById: string | null = null;
    let reviewedAt: Date | null = null;
    if (r.status !== ReportStatusValues.OPEN && r.reviewedByEmail) {
      reviewedById = userIds.get(r.reviewedByEmail) ?? null;
      reviewedAt = new Date();
    }

    const existing = await reportRepo.findOne({ where: { reporterId, targetType: r.targetType, targetId, reason: r.reason } });
    if (existing) {
      reportRepo.merge(existing, { description: r.description ?? null, status: r.status, reviewedById, reviewedAt });
      await reportRepo.save(existing);
      continue;
    }

    await reportRepo.save(reportRepo.create({
      reporterId,
      targetType: r.targetType,
      targetId,
      reason: r.reason,
      description: r.description ?? null,
      status: r.status,
      reviewedById,
      reviewedAt,
    }));
  }
  console.log(`   ${REPORTS.length} reports processed`);

  // ─── 13. Tokens ───────────────────────────────────────────────────────
  console.log('\n📱 Seeding FCM tokens...');
  for (const t of TOKENS) {
    const userId = userIds.get(t.userEmail);
    if (!userId) continue;

    const existing = await tokenRepo.findOne({ where: { userId, deviceId: t.deviceId } });
    if (existing) {
      tokenRepo.merge(existing, { fcmToken: t.fcmToken });
      await tokenRepo.save(existing);
      continue;
    }

    await tokenRepo.save(tokenRepo.create({ fcmToken: t.fcmToken, deviceId: t.deviceId, userId }));
  }
  console.log(`   ${TOKENS.length} tokens processed`);

  // ─── 14. Reputation Logs (dense this month + 2 prior months for leaderboard) ──
  console.log('\n⭐ Seeding reputation logs...');
  let logsCreated = 0;

  // Clear all existing logs first
  await reputationLogRepo.query('TRUNCATE TABLE "reputation_logs" RESTART IDENTITY CASCADE;');

  // Completed reservations → live donation_completed + pickup_completed with referenceId
  const completedReservations = RESERVATIONS.filter(r =>
    r.status === ReservationStatusValues.COMPLETED,
  );

  for (const res of completedReservations) {
    const donorId = userIds.get(res.donorEmail);
    const beneficiaryId = userIds.get(res.beneficiaryEmail);
    const donationId = donationIds.get(`${res.donorEmail}::${res.donationTitle}`);
    if (!donorId || !beneficiaryId || !donationId) continue;

    const reservation = await reservationRepo.findOne({
      where: { donationId, beneficiaryId },
    });
    if (!reservation) continue;

    const confirmedAt = res.confirmedAt ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);

    const donorPoints = 15 + Math.floor(Math.random() * 25);
    await reputationLogRepo.save(reputationLogRepo.create({
      userId: donorId,
      pointsGained: donorPoints,
      source: ReputationLogSourceValues.DONATION_COMPLETED,
      referenceId: donationId,
      createdAt: confirmedAt,
    }));
    logsCreated++;

    const pickupPoints = 10 + Math.floor(Math.random() * 15);
    await reputationLogRepo.save(reputationLogRepo.create({
      userId: beneficiaryId,
      pointsGained: pickupPoints,
      source: ReputationLogSourceValues.PICKUP_COMPLETED,
      referenceId: donationId,
      createdAt: new Date(confirmedAt.getTime() + 1000 * 60 * 30),
    }));
    logsCreated++;
  }

  // Helper: produce N entries spread across a date range
  const spreadPoints = (totalPoints: number, count: number, startDaysAgo: number, endDaysAgo: number): Array<{ points: number; daysAgo: number }> => {
    const entries: Array<{ points: number; daysAgo: number }> = [];
    let remaining = totalPoints;
    for (let i = 0; i < count && remaining > 0; i++) {
      const points = i === count - 1 ? remaining : Math.max(5, Math.floor(remaining / (count - i) * (0.5 + Math.random())));
      if (points <= 0) continue;
      remaining -= points;
      const daysAgo = Math.floor(endDaysAgo + ((startDaysAgo - endDaysAgo) * i) / count + Math.random() * 3);
      entries.push({ points, daysAgo });
    }
    return entries;
  };

  // ── June (this month) — dense coverage for dashboard visualisation ──
  const juneDonations: Array<{ email: string; totalPoints: number; count: number; source: typeof ReputationLogSourceValues.DONATION_COMPLETED | typeof ReputationLogSourceValues.PICKUP_COMPLETED }> = [
    // Donors — DONATION_COMPLETED
    { email: 'ngo@gaspzero.local', totalPoints: 120, count: 6, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'mosque@gaspzero.local', totalPoints: 100, count: 5, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'boulangerie@gaspzero.local', totalPoints: 90, count: 5, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'supermarche@gaspzero.local', totalPoints: 75, count: 4, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'hopital@gaspzero.local', totalPoints: 60, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'nour@gaspzero.local', totalPoints: 55, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'hotel@gaspzero.local', totalPoints: 45, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'epicerie@gaspzero.local', totalPoints: 40, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    // Beneficiaries — PICKUP_COMPLETED
    { email: 'karim@gaspzero.local', totalPoints: 85, count: 5, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'salima@gaspzero.local', totalPoints: 80, count: 5, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'fatima@gaspzero.local', totalPoints: 70, count: 4, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'yassine@gaspzero.local', totalPoints: 50, count: 4, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'leila@gaspzero.local', totalPoints: 35, count: 3, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'reda@gaspzero.local', totalPoints: 25, count: 2, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'sara@gaspzero.local', totalPoints: 40, count: 3, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'admin@gaspzero.local', totalPoints: 30, count: 2, source: ReputationLogSourceValues.PICKUP_COMPLETED },
  ];

  // June days: spread across days 0–28 of this month
  for (const entry of juneDonations) {
    const userId = userIds.get(entry.email);
    if (!userId) continue;

    const entries = spreadPoints(entry.totalPoints, entry.count, 0, 28);
    for (const e of entries) {
      const createdAt = new Date(Date.now() - e.daysAgo * 24 * 60 * 60 * 1000);
      await reputationLogRepo.save(reputationLogRepo.create({
        userId,
        pointsGained: e.points,
        source: entry.source,
        createdAt,
      }));
      logsCreated++;
    }
  }

  // ── May (last month) — moderate coverage ──
  const mayEntries: Array<{ email: string; totalPoints: number; count: number; source: typeof ReputationLogSourceValues.DONATION_COMPLETED | typeof ReputationLogSourceValues.PICKUP_COMPLETED }> = [
    { email: 'ngo@gaspzero.local', totalPoints: 150, count: 5, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'mosque@gaspzero.local', totalPoints: 130, count: 5, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'boulangerie@gaspzero.local', totalPoints: 110, count: 4, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'supermarche@gaspzero.local', totalPoints: 90, count: 4, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'hopital@gaspzero.local', totalPoints: 80, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'nour@gaspzero.local', totalPoints: 70, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'karim@gaspzero.local', totalPoints: 100, count: 5, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'salima@gaspzero.local', totalPoints: 90, count: 4, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'fatima@gaspzero.local', totalPoints: 80, count: 4, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'yassine@gaspzero.local', totalPoints: 55, count: 3, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'admin@gaspzero.local', totalPoints: 50, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'leila@gaspzero.local', totalPoints: 40, count: 3, source: ReputationLogSourceValues.PICKUP_COMPLETED },
  ];

  // May days: 31–58 days ago
  for (const entry of mayEntries) {
    const userId = userIds.get(entry.email);
    if (!userId) continue;

    const entries = spreadPoints(entry.totalPoints, entry.count, 31, 58);
    for (const e of entries) {
      const createdAt = new Date(Date.now() - e.daysAgo * 24 * 60 * 60 * 1000);
      await reputationLogRepo.save(reputationLogRepo.create({
        userId,
        pointsGained: e.points,
        source: entry.source,
        createdAt,
      }));
      logsCreated++;
    }
  }

  // ── April (2 months ago) — lighter coverage ──
  const aprilEntries: Array<{ email: string; totalPoints: number; count: number; source: typeof ReputationLogSourceValues.DONATION_COMPLETED | typeof ReputationLogSourceValues.PICKUP_COMPLETED }> = [
    { email: 'ngo@gaspzero.local', totalPoints: 80, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'boulangerie@gaspzero.local', totalPoints: 70, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'mosque@gaspzero.local', totalPoints: 60, count: 3, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'supermarche@gaspzero.local', totalPoints: 50, count: 2, source: ReputationLogSourceValues.DONATION_COMPLETED },
    { email: 'karim@gaspzero.local', totalPoints: 60, count: 3, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'salima@gaspzero.local', totalPoints: 55, count: 3, source: ReputationLogSourceValues.PICKUP_COMPLETED },
    { email: 'fatima@gaspzero.local', totalPoints: 40, count: 2, source: ReputationLogSourceValues.PICKUP_COMPLETED },
  ];

  // April days: 61–88 days ago
  for (const entry of aprilEntries) {
    const userId = userIds.get(entry.email);
    if (!userId) continue;

    const entries = spreadPoints(entry.totalPoints, entry.count, 61, 88);
    for (const e of entries) {
      const createdAt = new Date(Date.now() - e.daysAgo * 24 * 60 * 60 * 1000);
      await reputationLogRepo.save(reputationLogRepo.create({
        userId,
        pointsGained: e.points,
        source: entry.source,
        createdAt,
      }));
      logsCreated++;
    }
  }

  console.log(`   ${logsCreated} reputation logs created`);
  console.log(`   Breakdown: ${completedReservations.length * 2} from reservations + June/May/April historical`);

  await dataSource.destroy();
  console.log('\n✅ Demo seed completed!');
}

seedDemo()
  .then(() => { process.exit(0); })
  .catch((err: unknown) => {
    console.error('❌ Demo seed failed:', err);
    process.exit(1);
  });