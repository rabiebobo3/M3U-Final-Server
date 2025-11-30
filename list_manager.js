async function connectDBAndSeedDefaultUser() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected Successfully!');
        
        // --- محاولة إنشاء المستخدم الافتراضي ---
        /*
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
        */
        // ------------------------------------

    } catch (err) {
        console.error(`!!! MongoDB connection error: ${err.message}. Check your MONGO_URI and network access.`);
        // لا نحتاج لإيقاف الخادم لأننا بدأناه بالفعل
    }
}
