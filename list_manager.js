const express = require('express');
const cors = require('cors');
const MONGO_URI = process.env.MONGO_URI; 


const app = express();
const port = process.env.PORT || 4000; 

// **********************************************
// 🟢 رابط MongoDB المؤكد والمعدل
// **********************************************
const MONGO_URI = 'mongodb+srv://rabiebobo3_db_user:cjwPGZVqrpkwrp97@cluster0.dkdtiys.mongodb.net/?retryWrites=true&w=majority'; 
// **********************************************

// 1. تهيئة الاتصال بـ MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected Successfully!');
        
        // إنشاء مستخدم افتراضي عند أول تشغيل
        User.findOne({ username: 'admin' }).then(user => {
            if (!user) {
                const defaultUser = new User({
                    username: 'admin',
                    token: 'admin123', // رمز المدير الافتراضي
                    connection_limit: 999,
                    status: 'active'
                });
                defaultUser.save().then(() => console.log("Default admin user created with token: admin123"));
            }
        });
    })
    .catch(err => {
        console.error('MongoDB connection error. Check your MONGO_URI and network access:', err);
        process.exit(1);
    });

// 2. تعريف مخططات (Schemas) قاعدة البيانات
const ChannelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    group_title: { type: String, default: 'General' },
    tvg_id: { type: String, default: '' }
});
const Channel = mongoose.model('Channel', ChannelSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    token: { type: String, required: true, unique: true },
    connection_limit: { type: Number, default: 1 },
    status: { type: String, default: 'active' } // active, inactive, blocked
});
const User = mongoose.model('User', UserSchema);


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ******************************************************
// 3. نقاط النهاية الرئيسية (APIs)
// ******************************************************

// أ. نقطة نهاية M3U النهائية (/list.m3u)
app.get('/list.m3u', async (req, res) => {
    const userToken = req.query.token;
    if (!userToken) { return res.status(401).send("#EXTM3U\n#ERROR: Access Token is missing."); }

    try {
        const user = await User.findOne({ token: userToken, status: 'active' });
        if (!user) { return res.status(403).send("#EXTM3U\n#ERROR: Invalid or inactive Token."); }

        const channels = await Channel.find().sort({ group_title: 1, name: 1 });

        let m3uContent = '#EXTM3U\n';
        channels.forEach(channel => {
            m3uContent += `#EXTINF:-1 tvg-id="${channel.tvg_id || ''}" group-title="${channel.group_title || 'General'}", ${channel.name}\n`;
            m3uContent += `${channel.url}\n`;
        });
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.send(m3uContent);

    } catch (error) {
        console.error('M3U Generation Error:', error);
        res.status(500).send("#EXTM3U\n#ERROR: Server internal error.");
    }
});

// ب. نقاط نهاية إدارة القنوات (/api/channels)
app.post('/api/channels', async (req, res) => {
    const { name, url, group_title, tvg_id } = req.body;
    try {
        const newChannel = new Channel({ name, url, group_title, tvg_id });
        await newChannel.save();
        res.json({ success: true, message: `تم إضافة القناة "${name}" بنجاح!` });
    } catch (err) {
        if (err.code === 11000) { 
            return res.status(409).json({ success: false, message: 'هذا الرابط موجود بالفعل.' });
        }
        res.status(500).json({ success: false, message: 'خطأ في الخادم.' });
    }
});

app.get('/api/channels', async (req, res) => {
    try {
        const channels = await Channel.find().sort({ group_title: 1, name: 1 });
        res.json({ success: true, channels: channels });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في استرداد القنوات.' });
    }
});

app.delete('/api/channels/:id', async (req, res) => {
    const channelId = req.params.id;
    try {
        const result = await Channel.deleteOne({ _id: channelId });
        if (result.deletedCount === 0) { return res.status(404).json({ success: false, message: 'القناة غير موجودة.' }); }
        res.json({ success: true, message: `تم حذف القناة بنجاح (ID: ${channelId}).` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في الخادم.' });
    }
});

// ج. نقاط نهاية إدارة المستخدمين (/api/users)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { _id: 1, username: 1, token: 1, connection_limit: 1, status: 1 });
        res.json({ success: true, users: users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في استرداد المستخدمين.' });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, token, connection_limit, status } = req.body;
    try {
        const newUser = new User({ username, token, connection_limit: parseInt(connection_limit) || 1, status: status || 'active' });
        await newUser.save();
        res.json({ success: true, message: `تم إضافة المستخدم "${username}" بنجاح!` });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'اسم المستخدم أو الرمز موجود بالفعل.' });
        }
        res.status(500).json({ success: false, message: 'خطأ في الخادم.' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { connection_limit, status } = req.body;
    
    try {
        const updateFields = {};
        if (connection_limit !== undefined) updateFields.connection_limit = parseInt(connection_limit);
        if (status) updateFields.status = status;

        const result = await User.findByIdAndUpdate(userId, updateFields, { new: true });
        
        if (!result) { return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' }); }
        res.json({ success: true, message: `تم تحديث المستخدم ${result.username} بنجاح!` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في التحديث.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

