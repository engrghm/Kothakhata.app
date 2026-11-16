// UI language layer. Screens are written in Bangla; in English mode this translates
// every rendered text node and label attribute (exact phrases + patterns for dynamic text).
// User content is skipped: anything inside [translate="no"], and input values.
import * as db from './db.js';

export const lang = () => db.settings().lang || 'bn';
const N = (s) => String(s).normalize('NFC').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));

const RAW = {
  // brand / shell
  'কথাখাতা': 'KothaKhata', 'কথাখাতা হোম': 'KothaKhata home', 'মূল অংশে যান': 'Skip to content', 'প্রধান মেনু': 'Main menu',
  'হিসাব': 'Money', 'পাবো-দিবো': 'Lend/Borrow', 'বাজেট': 'Budget', 'সঞ্চয়': 'Savings', 'কাজ': 'Tasks', 'নোট': 'Notes', 'অ্যালার্ম': 'Alarms', 'আরও': 'More',
  'নোটিফিকেশন': 'Notifications', 'সেটিংস': 'Settings', 'খাতা বদলান': 'Switch book', 'কিছু একটা ভুল হয়েছে': 'Something went wrong', 'কথাখাতা খুলছে…': 'Opening KothaKhata…',
  // common
  'আয়': 'Income', 'খরচ': 'Expense', 'বাকি': 'Balance', 'ট্রান্সফার': 'Transfer', 'আজ': 'Today', 'মাস': 'Month', 'সব': 'All', 'গতকাল': 'Yesterday', 'আগামীকাল': 'Tomorrow',
  'আগের মাস': 'Previous month', 'পরের মাস': 'Next month', 'আগে': 'Earlier', 'পরে': 'Later', 'সময়': 'Time', 'তারিখ': 'Date', 'ফিরে যান': 'Go back', 'মুছুন': 'Delete', 'বদলান': 'Edit',
  'সেভ': 'Save', 'সেভ করুন': 'Save', 'যোগ করুন': 'Add', 'বাতিল': 'Cancel', 'হ্যাঁ': 'Yes', 'না': 'No', 'নাম': 'Name', 'টাকা': 'Amount', 'নতুন': 'New', 'শেষ': 'Done',
  'চালু': 'On', 'বন্ধ': 'Paused', 'রং': 'Colour', 'রং:': 'Colour:', 'খুঁজুন': 'Search', 'সাজান': 'Sort', 'সারাংশ': 'Summary', 'ধরন': 'Type', 'বিবরণ': 'Description',
  'সেভ হয়েছে': 'Saved', 'মুছে ফেলা হয়েছে': 'Deleted', 'মুছে ফেলবেন?': 'Delete this?', 'কপি করুন': 'Copy', 'কপি হয়েছে': 'Copied', 'কল': 'Call', 'জন': 'people',
  'বদলান ': 'Edit', 'শুরু': 'Start', 'থেকে': 'from', 'যেমন:': 'e.g.', 'চেপে বলুন': 'and speak', 'মাইক': 'mic', 'প্রিন্ট': 'Print', 'লোগো': 'Logo', 'স্বাক্ষর': 'Signature',
  // home / entries
  'প্রথম এন্ট্রি দিন — নিচের': 'Add your first entry — tap the', 'বাটন চাপুন, অথবা': 'button below, or tap the', 'চেপে বলুন “আজ বাজারে 500 টাকা খরচ”।': 'and say “Spent 500 on groceries today”.',
  'খুঁজুন: নোট, ক্যাটাগরি বা টাকা': 'Search: note, category or amount', 'গ্রাফ ও বিশ্লেষণ': 'Charts & analysis', 'গ্রাফ': 'Charts', 'ক্যাটাগরি': 'Categories',
  'কিছু পাওয়া যায়নি': 'Nothing found', 'এই সময়ে কোনো লেনদেন নেই': 'No entries in this period', '+ চেপে প্রথম হিসাবটা লিখুন': 'Tap + to add your first entry',
  'বলে এন্ট্রি দিন': 'Speak an entry', 'নতুন এন্ট্রি': 'New entry', 'এন্ট্রি বদলান': 'Edit entry', 'এন্ট্রিটা পাওয়া যায়নি': 'Entry not found', 'এন্ট্রিটা মুছে ফেলবেন?': 'Delete this entry?',
  'বলে দিন': 'Say it', 'যেমন: “গতকাল রিকশা ভাড়া 80 টাকা” বা “বেতন পেলাম 25 হাজার”': 'e.g. “Spent 500 on groceries today” or “Got salary 25 thousand”',
  'এই ব্রাউজারে ভয়েস নেই — Chrome বা Edge-এ খুলুন': 'No voice in this browser — open in Chrome or Edge', 'টাকার পরিমাণ': 'Amount', '+ নতুন': '+ New', 'ওয়ালেট': 'Wallet',
  'যেখান থেকে': 'From', 'যেখানে': 'To', 'বিবরণ (ঐচ্ছিক)': 'Description (optional)', 'কী নিয়ে?': 'What for?', 'নিয়মিত (রিপিট)': 'Repeat (recurring)', 'নিয়মিত এন্ট্রি': 'Recurring entry',
  'প্রতিদিন': 'Daily', 'প্রতি মাসে': 'Monthly', 'প্রতি বছর': 'Yearly', 'তারিখ (মাসের)': 'Day of month', 'প্রথম এন্ট্রি এখনই যোগ হবে, পরেরগুলো সময়মতো নিজে থেকে।': 'The first entry is added now; the next ones are added automatically on time.',
  'টাকার পরিমাণ লিখুন': 'Enter an amount', 'আলাদা দুটি ওয়ালেট বেছে নিন': 'Pick two different wallets', 'শুনছি… বলুন': 'Listening… speak now',
  'ঠিক আছে কিনা দেখে “যোগ করুন” চাপুন': 'Check it, then tap “Add”', 'টাকার পরিমাণ বুঝিনি — লিখে দিন': 'Could not catch the amount — type it',
  // categories
  'খরচ কোথায়': 'Where it went', 'আয় কোথা থেকে': 'Where it came from', 'আয় ও খরচ': 'Income & expense', 'দুটোই': 'Both', 'নতুন ক্যাটাগরি': 'New category', 'ক্যাটাগরি বদলান': 'Edit category',
  'ভয়েস চেনার শব্দ (স্পেস দিয়ে)': 'Voice keywords (space separated)', 'যেমন: রিকশা বাস ভাড়া': 'e.g. rickshaw bus fare', 'কোনো ক্যাটাগরি নেই': 'No categories', 'নাম লিখুন': 'Enter a name',
  'বাজার': 'Groceries', 'খাবার': 'Food', 'যাতায়াত': 'Transport', 'বাসা ভাড়া': 'Rent', 'বিল': 'Bills', 'মোবাইল রিচার্জ': 'Mobile recharge', 'চিকিৎসা': 'Medical', 'শিক্ষা': 'Education',
  'কেনাকাটা': 'Shopping', 'বিনোদন': 'Entertainment', 'দান-সদকা': 'Charity', 'অন্যান্য খরচ': 'Other expense', 'বেতন': 'Salary', 'ব্যবসা': 'Business', 'উপহার': 'Gifts', 'অন্যান্য আয়': 'Other income',
  'অন্যান্য': 'Other', 'ক্যাটাগরি ছাড়া': 'Uncategorised', 'নগদ': 'Cash', 'ব্যক্তিগত': 'Personal',
  // stats / report
  'বিশ্লেষণ': 'Analysis', 'রিপোর্ট': 'Report', 'হিসাবের ক্যালেন্ডার': 'Entry calendar', 'হিসাব আছে': 'Has entries', 'হিসাব নেই': 'No entries', 'মোট আয়': 'Total income', 'মোট খরচ': 'Total expense',
  'গত 6 মাস': 'Last 6 months', 'গত ছয় মাসের আয় ও খরচ': 'Income and expense, last six months', 'এই মাসে কিছু নেই': 'Nothing this month', 'এ বছরে এখনো হিসাব নেই': 'No entries this year yet',
  'PDF / প্রিন্ট': 'PDF / Print', 'বছর': 'Year', 'নিজে বাছুন': 'Custom', 'প্রিন্ট উইন্ডোতে “Save as PDF” বেছে নিলে PDF ফাইল হবে। রিপোর্টের মাথায় নাম/লোগো বসাতে: সেটিংস → রিপোর্টের তথ্য।': 'Choose “Save as PDF” in the print window to get a PDF. To put your name/logo on top: Settings → Report details.',
  'আয়-ব্যয় রিপোর্ট': 'Income & expense report', 'ক্যাটাগরি অনুযায়ী': 'By category', 'কোনো লেনদেন নেই': 'No entries', 'রিপোর্ট / PDF': 'Report / PDF',
  // wallets / quick / recurring
  'মোট ব্যালেন্স': 'Total balance', 'ট্রান্সফারের ইতিহাস': 'Transfer history', 'কোনো ওয়ালেট নেই': 'No wallets', '+ চেপে নগদ, ব্যাংক বা মোবাইল ব্যাংকিং যোগ করুন': 'Tap + to add cash, bank or mobile banking',
  'নতুন ওয়ালেট': 'New wallet', 'ওয়ালেট বদলান': 'Edit wallet', 'যেমন: ব্যাংক, মোবাইল ব্যাংকিং': 'e.g. Bank, Mobile banking', 'শুরুর ব্যালেন্স': 'Opening balance', 'এই ওয়ালেটে লেনদেন আছে, তাই মোছা যাবে না': 'This wallet has entries, so it cannot be deleted',
  'কুইক এন্ট্রি': 'Quick entry', 'রোজকার একই খরচ (চা, রিকশা) একবার সেভ করুন — হোম থেকে এক চাপে যোগ হবে।': 'Save everyday costs (tea, rickshaw) once — add them from home with one tap.',
  'কোনো কুইক এন্ট্রি নেই': 'No quick entries', 'নতুন কুইক এন্ট্রি': 'New quick entry', 'কুইক এন্ট্রি বদলান': 'Edit quick entry', 'যেমন: সকালের চা': 'e.g. Morning tea', 'নাম আর টাকা দুটোই লিখুন': 'Enter both name and amount',
  'নিয়মিত লেনদেন': 'Recurring entries', 'নতুন নিয়মিত এন্ট্রি দিতে: নতুন এন্ট্রি ফর্মে “নিয়মিত (রিপিট)” চালু করুন।': 'To add one: turn on “Repeat (recurring)” on the new entry form.',
  'কোনো নিয়মিত লেনদেন নেই': 'No recurring entries', 'চালু/বন্ধ': 'On/off', 'নিয়মিত এন্ট্রিটা বন্ধ করে মুছবেন? আগের এন্ট্রিগুলো থাকবে।': 'Stop and delete this recurring entry? Past entries stay.', 'এন্ট্রি': 'Entry',
  // lend/borrow
  'পাবো': 'To get', 'দিবো': 'To give', 'মানুষ': 'People', 'শোধ': 'Settled', 'নাম বা ফোন নম্বর দিয়ে খুঁজুন': 'Search by name or phone', 'কাউকে পাওয়া যায়নি': 'No one found',
  'কোনো দেনা-পাওনা নেই': 'No lend/borrow records', '+ চেপে মানুষ যোগ করুন, তারপর কত দিলেন/নিলেন লিখুন': 'Tap + to add a person, then record what you gave or took',
  'নতুন মানুষ': 'New person', 'তথ্য বদলান': 'Edit details', 'ফোন (ঐচ্ছিক)': 'Phone (optional)', 'ঠিকানা (ঐচ্ছিক)': 'Address (optional)', 'টাকা অনুযায়ী সাজানো': 'Sorted by amount', 'নাম অনুযায়ী সাজানো': 'Sorted by name',
  'দিলাম (ধার)': 'Lent', 'নিলাম (ধার)': 'Borrowed', 'ফেরত পেলাম': 'Got back', 'ফেরত দিলাম': 'Paid back', 'দিলাম': 'Lent', 'নিলাম': 'Borrowed', 'কোনো বাকি নেই': 'Nothing due',
  'হোয়াটসঅ্যাপে পাঠান': 'Send on WhatsApp', 'এখনো কোনো লেনদেন নেই': 'No records yet', 'এই মানুষটিকে মুছুন': 'Delete this person', 'লেনদেন বদলান': 'Edit record', 'নোট (ঐচ্ছিক)': 'Note (optional)', 'টাকা লিখুন': 'Enter an amount',
  // budget / savings
  'মোট বাকি': 'Total left', 'খরচ হয়েছে': 'Spent', 'মোট বাজেট': 'Total budget', 'সব খরচ': 'All expenses', 'সীমা পার': 'Over limit', 'প্রায় শেষ': 'Almost used', 'নির্দিষ্ট টাকা': 'Fixed amount',
  'শুধু এই মাসে': 'This month only', 'কোনো বাজেট নেই': 'No budgets', '+ চেপে মাসের খরচের সীমা ঠিক করুন': 'Tap + to set a monthly spending limit', 'নতুন বাজেট': 'New budget', 'বাজেট বদলান': 'Edit budget',
  'আয়ের %': '% of income', 'সব খরচ (মোট)': 'All expenses (total)', 'আয়ের কত শতাংশ': 'Percent of income', 'পরিমাণ লিখুন': 'Enter an amount',
  'মোট সঞ্চয়': 'Total savings', 'তুলুন': 'Withdraw', 'জমা দিন': 'Deposit', 'জমা': 'saved', '🎉 লক্ষ্য পূরণ হয়েছে!': '🎉 Goal reached!', 'কোনো সঞ্চয়ের খাত নেই': 'No savings goals',
  '+ চেপে লক্ষ্য ঠিক করুন — যেমন “ঈদের কেনাকাটা” বা “জরুরি তহবিল”': 'Tap + to set a goal — e.g. “Eid shopping” or “Emergency fund”', 'এত টাকা জমা নেই': 'Not that much saved',
  'নতুন সঞ্চয়ের খাত': 'New savings goal', 'খাত বদলান': 'Edit goal', 'খাতের নাম': 'Goal name', 'লক্ষ্য (টাকা)': 'Target (amount)', 'নাম আর লক্ষ্য দুটোই লিখুন': 'Enter both name and target', 'খাত ও এর সব জমা মুছবেন?': 'Delete this goal and all its deposits?',
  // tasks
  'চলমান': 'Open', 'নতুন কাজ লিখুন বা মাইকে বলুন…': 'Type a new task or say it…', 'নতুন কাজ': 'New task', 'বলে কাজ লিখুন': 'Speak a task', 'জরুরি': 'Urgent', 'সাধারণ': 'Normal', 'পরে করলেও চলবে': 'Can wait',
  'আবার চালু করুন': 'Reopen', 'শেষ হয়েছে': 'Mark done', 'কোনো চলমান কাজ নেই': 'No open tasks', 'এখনো কোনো কাজ শেষ হয়নি': 'No tasks done yet', 'উপরের ঘরে লিখুন বা মাইক চেপে বলুন': 'Type above or tap the mic',
  'শেষ হওয়া সব কাজ মুছুন': 'Delete all done tasks', 'শেষ হওয়া সব কাজ মুছবেন?': 'Delete all done tasks?', 'কাজ যোগ হয়েছে': 'Task added', 'সাবাস! কাজ শেষ ✓': 'Well done! Task finished ✓',
  'বিস্তারিত কাজ যোগ করুন': 'Add a detailed task', 'কাজ বদলান': 'Edit task', 'গুরুত্ব': 'Priority', 'শেষ করার সময় (ঐচ্ছিক)': 'Due (optional)', 'রিমাইন্ডার (ঐচ্ছিক)': 'Reminder (optional)',
  '10 মিনিট পরে': 'In 10 minutes', '1 ঘণ্টা পরে': 'In 1 hour', 'কাল সকাল 9টা': 'Tomorrow 9 AM', 'কাজটা লিখুন': 'Write the task', 'বলে লিখুন': 'Dictate',
  // notes
  'নোট খুঁজুন': 'Search notes', 'শিরোনাম নেই': 'Untitled', 'কোনো নোট নেই': 'No notes', '+ চেপে লিখুন বা মুখে বলুন': 'Tap + to write or speak', 'বলে নোট লিখুন': 'Speak a note', 'নতুন নোট': 'New note',
  'নোটটা পাওয়া যায়নি': 'Note not found', 'উপরে পিন করুন': 'Pin to top', 'পিন সরান': 'Unpin', 'রিমাইন্ডার': 'Reminder', 'পড়ার মোড': 'Reading mode', 'এডিট করুন': 'Edit', 'শিরোনাম': 'Title',
  'লিখুন… অথবা মাইক চেপে বলুন': 'Write… or tap the mic and speak', 'নোট রিমাইন্ডার': 'Note reminder', 'কখন মনে করাবো': 'Remind me at', 'সরান': 'Remove', 'আগে কিছু লিখুন': 'Write something first',
  'রিমাইন্ডার সেট হয়েছে': 'Reminder set', 'নোটটা মুছে ফেলবেন?': 'Delete this note?', 'কিছু লেখা নেই': 'Nothing written',
  // alarms
  'অ্যালার্ম ও রিমাইন্ডার': 'Alarms & reminders', 'অনুমতি দিন': 'Allow', 'ব্রাউজারে নোটিফিকেশন বন্ধ করা আছে। ঠিকানা বারের পাশের আইকন থেকে চালু করুন।': 'Notifications are blocked in this browser. Turn them on from the icon next to the address bar.',
  'অন্য ট্যাবে থাকলেও যেন জানাতে পারি, নোটিফিকেশনের অনুমতি দিন।': 'Allow notifications so reminders reach you even in another tab.',
  'অ্যালার্ম বাজবে যখন কথাখাতা খোলা থাকবে (ট্যাবে বা ইনস্টল করা অ্যাপে)। ফোন লক থাকলেও বাজানোর জন্য পরের সংস্করণে Android অ্যাপ আসবে।': 'Alarms ring while KothaKhata is open (a tab or the installed app). An Android app for ringing on a locked phone comes in a later version.',
  'কোনো অ্যালার্ম নেই': 'No alarms', '+ চেপে অ্যালার্ম যোগ করুন': 'Tap + to add an alarm', 'সামনের রিমাইন্ডার': 'Upcoming reminders', 'শব্দ পরীক্ষা করুন': 'Test the sound', 'অ্যালার্ম চালু/বন্ধ': 'Alarm on/off',
  'নতুন অ্যালার্ম': 'New alarm', 'অ্যালার্ম বদলান': 'Edit alarm', 'নাম (ঐচ্ছিক)': 'Label (optional)', 'যেমন: ফজরের নামাজ, ওষুধ খাওয়া': 'e.g. Fajr prayer, take medicine', 'কোন দিন (কিছু না বাছলে একবার)': 'Days (none = once)',
  'অ্যালার্ম সেট হয়েছে': 'Alarm set', 'এক মিনিটের মধ্যে বাজবে — এই পাতাতেই থাকুন': 'It will ring within a minute — stay on this page', 'পরীক্ষা অ্যালার্ম': 'Test alarm', 'একবার': 'Once',
  'রবি': 'Sun', 'সোম': 'Mon', 'মঙ্গল': 'Tue', 'বুধ': 'Wed', 'বৃহঃ': 'Thu', 'শুক্র': 'Fri', 'শনি': 'Sat',
  'বন্ধ করুন': 'Stop', 'কাজের সময় হয়েছে': "It's time for this task", 'কাজের রিমাইন্ডার': 'Task reminder', 'অ্যালার্ম মিস হয়েছে': 'Missed alarm', 'নোট রিমাইন্ডার ': 'Note reminder',
  // inbox
  'সব পড়া হয়েছে': 'Mark all read', 'সব মুছুন': 'Delete all', 'কোনো নোটিফিকেশন নেই': 'No notifications', 'সব নোটিফিকেশন মুছবেন?': 'Delete all notifications?',
  'কথাখাতায় স্বাগতম': 'Welcome to KothaKhata', 'হিসাব, কাজ, নোট আর রিমাইন্ডার — সব এক জায়গায়। মাইক চেপে বাংলায় বলেও এন্ট্রি দিতে পারবেন।': 'Money, tasks, notes and reminders — all in one place. Tap the mic and speak to add entries.',
  // more / books
  'বিশ্লেষণ ': 'Analysis', 'প্রাইভেসি মোড (টাকা ঝাপসা)': 'Privacy mode (blur amounts)', 'প্রাইভেসি মোড': 'Privacy mode', 'খাতাসমূহ': 'Books', 'নতুন খাতা': 'New book',
  'ব্যক্তিগত, পরিবার, দোকান, অফিস — আলাদা খাতায় আলাদা হিসাব। কাজ, নোট আর অ্যালার্ম সব খাতায় একই থাকে।': 'Personal, family, shop, office — separate money in separate books. Tasks, notes and alarms are shared by all books.',
  'মূল খাতা': 'Main book', 'অতিরিক্ত খাতা': 'Extra book', 'সব তথ্য শুধু এই ডিভাইসে থাকে': 'All data stays on this device', 'সেটিংস থেকে নিয়মিত ব্যাকআপ নিন': 'Back up regularly from Settings', 'গোপনীয়তা নীতি': 'Privacy policy',
  'খাতার নাম': 'Book name', 'যেমন: পরিবার, দোকান': 'e.g. Family, Shop',
  // settings
  'থিম': 'Theme', 'ডিভাইস অনুযায়ী': 'Match device', 'লাইট': 'Light', 'ডার্ক': 'Dark', 'ভয়েস': 'Voice', 'কোন ভাষায় বলবেন': 'Speaking language', 'বাংলা': 'বাংলা', 'নোট/কাজে বলা লেখা': 'Dictated notes/tasks',
  'হুবহু': 'As spoken', 'গুছিয়ে': 'Tidied', 'বলা শেষে লেখা নিজে থেকে কপি': 'Copy text automatically after speaking', 'অটো কপি': 'Auto copy',
  'AI দিয়ে গোছানো (ঐচ্ছিক): আপনার নিজের Google Gemini API key': 'AI tidy-up (optional): your own Google Gemini API key', 'key এখানে দিন': 'Paste key here', '•••••••• (সেভ করা আছে)': '•••••••• (saved)',
  'key শুধু এই ডিভাইসে থাকে, সরাসরি Google-এর অফিসিয়াল API-তে যায়। key না দিলে অ্যাপ নিজেই সাধারণভাবে গুছিয়ে দেবে। key পাবেন aistudio.google.com থেকে।': 'The key stays on this device and goes straight to Google’s official API. Without a key the app does a simple tidy-up itself. Get a key at aistudio.google.com.',
  'key সেভ': 'Save key', 'key মুছুন': 'Remove key', 'key লিখুন': 'Enter a key', 'key সেভ হয়েছে': 'Key saved', 'key মুছে ফেলা হয়েছে': 'Key removed',
  'নিরাপত্তা': 'Security', 'পিন লক': 'PIN lock', 'পিন সেট করুন': 'Set PIN', 'পিন বন্ধ করুন': 'Turn off PIN', 'চালু আছে': 'On', 'পিন লক বন্ধ করবেন?': 'Turn off PIN lock?',
  'নতুন পিন (4 সংখ্যা)': 'New PIN (4 digits)', 'পিন': 'PIN', 'আবার লিখুন': 'Repeat', 'পিন ভুলে গেলে ফেরত পাওয়ার উপায় নেই — তার আগে ব্যাকআপ নিয়ে রাখুন।': 'A forgotten PIN cannot be recovered — take a backup first.',
  '4টি সংখ্যা দিন': 'Enter 4 digits', 'দুইবার একই পিন দিন': 'Enter the same PIN twice', 'পিন লক চালু': 'PIN lock on', 'পিন দিন': 'Enter PIN', 'ভুল পিন': 'Wrong PIN',
  'নোটিফিকেশন চালু': 'Notifications on', 'অনুমতি পাওয়া যায়নি': 'Permission not given', 'এই ব্রাউজারে নোটিফিকেশন নেই': 'No notifications in this browser',
  'রিপোর্টের তথ্য (PDF-এর মাথায়)': 'Report details (top of the PDF)', 'নাম / প্রতিষ্ঠান': 'Name / organisation', 'ছোট লাইন': 'Tagline', 'ফোন': 'Phone', 'ঠিকানা': 'Address', 'স্বাক্ষরকারীর নাম': 'Signer name',
  'লোগো আছে': 'Logo set', 'স্বাক্ষর আছে': 'Signature set', 'ছবিটা 400KB-এর ছোট দিন': 'Use an image under 400KB',
  'ব্যাকআপ': 'Backup', 'সব তথ্য এই ব্রাউজারে থাকে। ব্রাউজারের ডেটা মুছলে হিসাবও মুছে যাবে — তাই মাঝে মাঝে ব্যাকআপ ফাইল নামিয়ে রাখুন।': 'All data lives in this browser. Clearing browser data deletes it too — so download a backup file now and then.',
  'ব্যাকআপ নামান': 'Download backup', 'ব্যাকআপ থেকে ফেরত': 'Restore from backup', 'CSV (এক্সেল)': 'CSV (Excel)', 'সব তথ্য মুছে নতুন করে শুরু': 'Delete everything and start over',
  'এখনকার সব তথ্য মুছে ব্যাকআপের তথ্য বসবে। চালিয়ে যাবেন?': 'All current data will be replaced by the backup. Continue?', 'হ্যাঁ, ফেরত আনুন': 'Yes, restore', 'ব্যাকআপ থেকে ফেরত আনা হয়েছে': 'Restored from backup',
  'ফাইলটা পড়া যায়নি': 'Could not read the file', 'এটা কথাখাতার ব্যাকআপ ফাইল নয়': 'This is not a KothaKhata backup file',
  'সব হিসাব, কাজ, নোট, অ্যালার্ম মুছে যাবে। ফেরত আনা যাবে না। নিশ্চিত?': 'All money, tasks, notes and alarms will be deleted. This cannot be undone. Sure?', 'সব মুছুন ': 'Delete all', 'নতুন করে শুরু হলো': 'Started fresh',
  'ভাষা': 'Language', 'অ্যাপের ভাষা': 'App language', 'ফন্ট': 'Font',
  // voice to text
  'ভয়েস থেকে লেখা': 'Voice to text', 'key যোগ করুন': 'Add key', 'এখন চলছে': 'In use', 'আরেকটা key এখানে দিন': 'Paste another key here', 'নতুন Gemini API key': 'New Gemini API key', 'এই key আগেই যোগ করা আছে': 'This key is already added', 'একাধিক key রাখা যায়। একটার লিমিট শেষ হলে পরেরটা নিজে থেকে চলবে। key শুধু এই ডিভাইসে থাকে, সরাসরি Google-এর অফিসিয়াল API-তে যায়। key না দিলে অ্যাপ নিজেই সাধারণভাবে গুছিয়ে দেবে। key পাবেন aistudio.google.com থেকে।': 'You can keep several keys. When one reaches its limit, the next one takes over by itself. Keys stay on this device and go straight to Google’s official API. Without a key the app tidies text in a simple way. Get a key at aistudio.google.com.', 'ওয়ালেট ব্যবহার করব': 'Use wallets', 'ওয়ালেট ব্যবহার': 'Use wallets', 'ওয়ালেট চালু': 'Wallets on', 'ওয়ালেট বন্ধ': 'Wallets off', 'বন্ধ রাখলে এন্ট্রির ফর্মে ওয়ালেট আর ট্রান্সফার দেখাবে না। আগের তথ্য মুছবে না, আবার চালু করলে ফিরে আসবে।': 'When off, the entry form hides wallets and transfers. Nothing is deleted; turn it on again and they come back.', 'এই সপ্তাহের খরচ': 'This week’s spending', 'এই মাসের দৈনিক খরচ': 'This month’s spending by day', 'আয়ের কত অংশ খরচ হয়েছে': 'Share of income spent', 'বলে লেখা': 'Added by voice', 'নিয়মিত': 'Recurring', 'ভয়েস লেখা': 'Voice', 'বাংলা বা ইংরেজিতে বলুন — লেখা হয়ে যাবে। কপি করুন, নামান বা নোটে রাখুন।': 'Speak in Bangla or English — it becomes text. Copy it, download it or keep it as a note.',
  'লেখার ধরন': 'Writing style', 'ট্যাপ করে কথা বলুন': 'Tap and speak', 'শুনছি… থামাতে আবার চাপুন': 'Listening… tap again to stop', 'গোছানো হচ্ছে…': 'Tidying up…', 'লেখা': 'Text',
  'কথা বলুন, লেখা এখানে আসবে': 'Speak — your words appear here', 'যতিচিহ্ন': 'Punctuation', 'গুছিয়ে দিন': 'Tidy up', 'কপি': 'Copy', '.txt নামান': 'Download .txt', 'নোটে সেভ': 'Save as note',
  'মুছে ফেলুন': 'Clear', 'গোছানো হয়েছে': 'Tidied', 'নোটে সেভ হয়েছে': 'Saved as a note', 'গুছিয়ে দিতে আপনার Gemini key ব্যবহার হবে।': 'Tidy-up uses your Gemini key.',
  'গুছিয়ে দেওয়া এখন সাধারণভাবে হবে। AI দিয়ে আরও ভালো করতে সেটিংসে নিজের Gemini key দিন।': 'Tidy-up is basic for now. Add your own Gemini key in Settings for AI tidy-up.',
  // voice errors
  'এই ব্রাউজারে ভয়েস টাইপিং নেই। Chrome বা Edge ব্যবহার করুন।': 'No voice typing in this browser. Use Chrome or Edge.', 'এই ব্রাউজারে ভয়েস টাইপিং নেই': 'No voice typing in this browser',
  'ভয়েস টাইপিং-এর জন্য Chrome বা Edge লাগবে': 'Voice typing needs Chrome or Edge', 'মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ঠিকানা বারের পাশে মাইক আইকন থেকে অনুমতি দিন।': 'Microphone permission was not given. Allow it from the mic icon next to the address bar.',
  'কোনো কথা শোনা যায়নি, আবার চেষ্টা করুন।': 'Nothing heard, try again.', 'ভয়েস টাইপিং-এর জন্য ইন্টারনেট দরকার।': 'Voice typing needs internet.', 'মাইক্রোফোন পাওয়া যায়নি।': 'No microphone found.',
};
const DICT = new Map(Object.entries(RAW).map(([k, v]) => [N(k).trim(), v]));

// dynamic text patterns (applied to digit-normalised text)
const RULES = [
  [/^আয়ের (\d+)% খরচ হয়েছে$/, '$1% of income spent'],
  [/^(আয়|খরচ|ট্রান্সফার) (.+) যোগ হয়েছে$/, (m, k, a) => `${RAW[k]} ${a} added`],
  [/^(\d+)টি নিয়মিত এন্ট্রি যোগ হয়েছে$/, '$1 recurring entries added'],
  [/^(.+) যোগ হয়েছে$/, '$1 added'],
  [/^(\d+) জন$/, '$1 people'],
  [/^(আয়|খরচ) (-?৳.+)$/, (m, k, a) => `${RAW[k]} ${a}`],
  [/^(\d+)টি নতুন নোটিফিকেশন$/, '$1 new notifications'],
  [/^(\d+)টি এন্ট্রিতে এটা আছে। মুছলে ওগুলো ক্যাটাগরি ছাড়া থাকবে। মুছবেন\?$/, '$1 entries use it. They will become uncategorised. Delete?'],
  [/^ভয়েস শব্দ: (.+)$/, 'Voice words: $1'],
  [/^রং (#\w+)$/, 'Colour $1'],
  [/^শুধু (.+)$/, 'Only $1'],
  [/^(\d+) শব্দ$/, '$1 words'],
  [/^(\d+) অক্ষর$/, '$1 characters'],
  [/^(\d{4}) এক নজরে$/, '$1 at a glance'],
  [/^(\d{4}) সাল$/, 'Year $1'],
  [/^([\d-]+) থেকে ([\d-]+)$/, '$1 to $2'],
  [/^খাতা: (.+)$/, 'Book: $1'],
  [/^সব লেনদেন \((\d+)টি\)$/, 'All entries ($1)'],
  [/^তৈরি: (.+)$/, 'Generated: $1'],
  [/^শুরুর ব্যালেন্স (.+)$/, 'Opening balance $1'],
  [/^প্রতি মাসে (\d+) তারিখে$/, 'Monthly on day $1'],
  [/^পরেরটা (.+)$/, 'Next $1'],
  [/^(.+) আপনাকে দেবেন$/, '$1 owes you'],
  [/^আপনি (.+)-কে দেবেন$/, 'You owe $1'],
  [/^বাজেটের (\d+)% খরচ$/, '$1% of budget spent'],
  [/^আয়ের (\d+(?:\.\d+)?)%$/, '$1% of income'],
  [/^বেশি (.+)$/, 'Over by $1'],
  [/^বাকি (.+)$/, '$1 left'],
  [/^লক্ষ্য (.+)$/, 'Target $1'],
  [/^(.+) — টাকা তুলুন$/, '$1 — Withdraw'],
  [/^(.+) — জমা দিন$/, '$1 — Deposit'],
  [/^শেষ \((\d+)\)$/, 'Done ($1)'],
  [/^শেষ (.+)$/, 'Done $1'],
  [/^রিমাইন্ডার: (.+)$/, 'Reminder: $1'],
  [/^একবার(.*)$/, 'Once$1'],
  [/^স্নুজ (.+)$/, 'Snoozed till $1'],
  [/^শেষ ব্যাকআপ: (.+)$/, 'Last backup: $1'],
  [/^খাতা: (.+)$/, 'Book: $1'],
  [/^(\d+) সংখ্যা দেওয়া হয়েছে$/, '$1 digits entered'],
  [/^সাজান: (টাকা|নাম)$/, (m, k) => `Sort: ${k === 'টাকা' ? 'amount' : 'name'}`],
  [/^(.+) — (.+) \(তখন অ্যাপ বন্ধ ছিল\)$/, '$1 — $2 (the app was closed)'],
  [/^“(.+)” খাতা ও এর সব হিসাব মুছে যাবে। ফেরত আনা যাবে না। মুছবেন\?$/, '“$1” and all its entries will be deleted. This cannot be undone. Delete?'],
  [/^(.+) ও তাঁর সব লেনদেন মুছে ফেলবেন\?$/, 'Delete $1 and all their records?'],
  [/^কোনো key দিয়েই AI কাজ করেনি \((\d+)\)। সেটিংসে key গুলো দেখুন।$/, 'AI did not work with any key ($1). Check the keys in Settings.'],
  [/^AI কাজ করেনি \((\d+)\)। সেটিংসে key দেখুন।$/, 'AI did not work ($1). Check the key in Settings.'],
  [/^ভয়েস টাইপিং-এ সমস্যা: (.+)$/, 'Voice typing problem: $1'],
];

function core(text) {
  const n = N(text).trim();
  if (!n || !/[ঀ-৿]/.test(n)) return null;
  if (DICT.has(n)) return DICT.get(n);
  for (const [re, rep] of RULES) if (re.test(n)) return n.replace(re, (...a) => {
    const out = typeof rep === 'function' ? rep(...a) : rep.replace(/\$(\d)/g, (_, i) => a[+i]);
    return out.replace(/[ঀ-৿][ঀ-৿\s\-]*/g, (b) => DICT.get(N(b).trim()) ?? b); // translate leftover Bangla words (e.g. "Today")
  });
  return null;
}
export function t(text) {
  if (lang() !== 'en') return text;
  const s = String(text);
  if (s.includes('·')) return s.split('·').map((p) => t(p)).join('·');
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const r = core(m[2]);
  return r == null ? s : m[1] + r + m[3];
}

const ATTRS = ['placeholder', 'aria-label', 'title'];
export function translate(root = document.body) {
  if (lang() !== 'en' || !root) return;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => {
      if (n.nodeType === 1) return n.closest('[translate="no"], script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      return n.parentElement?.tagName === 'TEXTAREA' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const els = root.nodeType === 1 ? [root] : [];
  let node;
  while ((node = walk.nextNode())) {
    if (node.nodeType === 3) { const v = node.nodeValue; if (/[ঀ-৿]/.test(v)) { const r = t(v); if (r !== v) node.nodeValue = r; } }
    else els.push(node);
  }
  for (const el of els) for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v && /[ঀ-৿]/.test(v)) { const r = t(v); if (r !== v) el.setAttribute(a, r); } }
}

let obs = null;
export function startTranslator() {
  document.documentElement.lang = lang();
  if (obs) { obs.disconnect(); obs = null; }
  if (lang() !== 'en') return;
  translate(document.body);
  obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') { const v = m.target.nodeValue; if (/[ঀ-৿]/.test(v) && !m.target.parentElement?.closest('[translate="no"], textarea')) { const r = t(v); if (r !== v) m.target.nodeValue = r; } }
      else if (m.type === 'attributes') { const el = m.target; const v = el.getAttribute(m.attributeName); if (v && /[ঀ-৿]/.test(v) && !el.closest('[translate="no"]')) { const r = t(v); if (r !== v) el.setAttribute(m.attributeName, r); } }
      else for (const n of m.addedNodes) { if (n.nodeType === 1) translate(n); else if (n.nodeType === 3 && !n.parentElement?.closest('[translate="no"], textarea')) { const r = t(n.nodeValue); if (r !== n.nodeValue) n.nodeValue = r; } }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
