const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// قراءة المتغيرات السرية من بيئة التشغيل
const MONGO_URI = process.env.MONGO_URI; 
const PORT = process.env.PORT || 4000;

const app = express();

// ** 1. إعدادات Middleware الأساسية **
app.use(cors()); 
app.use(express.json()); 

// ** 2. تعريف المخططات (Schemas) **
const ChannelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, default: 'general' },
  tvg_id: { type: String, default: '' },
});
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  connection_limit: { type: Number, default: 1 },
  role: { type: String, default: 'active' },
  status: { type: String, default: 'active' },
});

const Channel = mongoose.model('Channel', ChannelSchema);
const User = mongoose.model('User', UserSchema);

// ** 3. تشغيل الخادم أولاً (المسارات الأساسية) **
// ابدأ بالاستماع إلى المنفذ لضمان عدم انهيار التطبيق
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  
  // بمجرد تشغيل الخادم، ابدأ محاولة الاتصال بـ MongoDB
  connectDBAndSeedDefaultUser();
});

// ** 4. وظيفة الاتصال بقاعدة البيانات والمسارات (Routes) **

async function connectDBAndSeedDefaultUser() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected Successfully!');
        
        // --- محاولة إنشاء المستخدم الافتراضي ---
        const user = await User.findOne({ username: 'admin' });
        if (!user) {
            const defaultUser = new User({
                username: 'admin',
                password: 'admin', 
                connection_limit: 999,
                role: 'مدير',
                status: 'active'
            });
            await defaultUser.save();
            console.log('Default admin user created successfully!');
        }
        // ------------------------------------

    } catch (err) {
        console.error(`!!! MongoDB connection error: ${err.message}. Check your MONGO_URI and network access.`);
        // لا نحتاج لإيقاف الخادم لأننا بدأناه بالفعل
    }
}


// ** 5. تعريف مسارات API (Routes) **

// مسار الصفحة الرئيسية للتأكد من أن الخادم يعمل
app.get('/', (req, res) => {
    res.send('M3U Final Server is running!');
});

// مثال لمسار جلب جميع القنوات
app.get('/api/channels', async (req, res) => {
    // يجب أن يعمل هذا المسار الآن حتى لو فشل الاتصال بقاعدة البيانات
    // (سيعرض خطأ 500 إذا فشل الاتصال، لكن الخادم لن ينهار)
    try {
        const channels = await Channel.find();
        res.status(200).json(channels);
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to retrieve channels from database." });
    }
});
