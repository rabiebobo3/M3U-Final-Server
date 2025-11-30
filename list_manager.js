const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// قراءة المتغيرات السرية من بيئة التشغيل
// MONGO_URI تم ربطه الآن بنجاح عبر Environment Group
const MONGO_URI = process.env.MONGO_URI; 
const PORT = process.env.PORT || 4000; // استخدم PORT المعين بواسطة Render أو 4000 كافتراضي

const app = express();

// ** 1. إعدادات Middleware الأساسية **
// تفعيل CORS للسماح بالطلبات من أي نطاق (للتجريب)
// يمكن تغيير cors() إلى cors({ origin: 'https://your-frontend-app.onrender.com' }) لاحقًا للأمان
app.use(cors()); 

// تمكين قراءة بيانات JSON المرسلة في جسم الطلب (Body)
app.use(express.json()); 

// ** 2. الاتصال بقاعدة بيانات MongoDB **

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully!'); // رسالة نجاح الاتصال

    // إنشاء مستخدم افتراضي عند أول تشغيل (من كودك الأصلي)
    User.findOne({ username: 'admin' })
      .then(user => {
        if (!user) {
          const defaultUser = new User({
            username: 'admin',
            password: 'admin', // يُفضل تشفير كلمة المرور في بيئة الإنتاج!
            connection_limit: 999,
            role: 'مدير',
            status: 'active'
          });
          defaultUser.save()
            .then(() => console.log('Default admin user created successfully!'))
            .catch(saveErr => console.error('Error saving default admin user:', saveErr.message));
        }
      })
      .catch(findErr => console.error('Error checking for admin user:', findErr.message));
  })
  .catch(err => {
    console.error(`MongoDB connection error: ${err.message}. Check your MONGO_URI and network access.`);
  });

// ** 3. تعريف المخططات (Schemas) **
// (نقل تعريف المخططات إلى هذا الجزء)

const channelSchema = new mongoose.Schema({ /* ... تفاصيل المخطط الأصلية ... */ });
const userSchema = new mongoose.Schema({ /* ... تفاصيل المخطط الأصلية ... */ });

// بناء المخطط بناءً على تعريفك الأصلي (مع الافتراض بأن لديك نفس الحقول):
const ChannelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, default: 'general' },
  tvg_id: { type: String, default: '' },
  // ... أضف أي حقول أخرى ...
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  connection_limit: { type: Number, default: 1 },
  role: { type: String, default: 'active' },
  status: { type: String, default: 'active' },
  // ... أضف أي حقول أخرى ...
});

const Channel = mongoose.model('Channel', ChannelSchema);
const User = mongoose.model('User', UserSchema);


// ** 4. تعريف مسارات API (Routes) **
// مثال لمسار اختبار:
app.get('/', (req, res) => {
    res.send('M3U Final Server is running!');
});

// مثال لمسار جلب البيانات:
app.get('/api/channels', async (req, res) => {
    try {
        const channels = await Channel.find();
        res.status(200).json(channels);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ** 5. تشغيل الخادم **

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
