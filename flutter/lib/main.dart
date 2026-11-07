import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/supabase_service.dart';
import 'widgets/matrimony_photo_manager.dart';
import 'widgets/supabase_config_screen.dart';

/// Main Application Entrypoint
///
/// Workflow:
/// 1. Ensures Flutter framework bindings are ready.
/// 2. Reads persisted Supabase credentials from [SharedPreferences] (falling back to default kzvdzospvgzlfkkptadl values).
/// 3. Initializes [SupabaseService] with the saved credentials.
/// 4. Boots the Material 3 Application with Photo Manager and live Configuration screens.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Read saved keys from SharedPreferences before initializing Supabase
  final prefs = await SharedPreferences.getInstance();
  final savedUrl = prefs.getString(SupabaseService.prefKeyUrl) ?? SupabaseService.defaultUrl;
  final savedAnonKey = prefs.getString(SupabaseService.prefKeyAnonKey) ?? SupabaseService.defaultAnonKey;

  // 2. Initialize Supabase with the persisted credentials
  await SupabaseService.initialize(
    url: savedUrl,
    anonKey: savedAnonKey,
  );

  // 3. Launch Application
  runApp(const I4YouMatrimonyApp());
}

class I4YouMatrimonyApp extends StatelessWidget {
  const I4YouMatrimonyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'I 4 You Matrimony',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE11D48),
          primary: const Color(0xFFE11D48),
          secondary: const Color(0xFF4F46E5),
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation: 0.5,
          centerTitle: false,
        ),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  String _activeProjectRef = 'kzvdzospvgzlfkkptadl';

  @override
  void initState() {
    super.initState();
    _refreshActiveProjectRef();
  }

  Future<void> _refreshActiveProjectRef() async {
    final credentials = await SupabaseService.loadSavedCredentials();
    final url = credentials['url'] ?? SupabaseService.defaultUrl;
    if (mounted) {
      setState(() {
        _activeProjectRef = SupabaseService.extractProjectRef(url);
      });
    }
  }

  void _openConfigurationModal() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => SupabaseConfigScreen(
          onConfigurationSaved: () {
            _refreshActiveProjectRef();
            Navigator.of(ctx).pop();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      const MatrimonyPhotoManager(),
      SupabaseConfigScreen(
        onConfigurationSaved: () {
          _refreshActiveProjectRef();
        },
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'I 4 You Matrimony',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'Supabase: $_activeProjectRef',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade600,
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            tooltip: 'Supabase Settings',
            onPressed: _openConfigurationModal,
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.photo_library_outlined),
            selectedIcon: Icon(Icons.photo_library_rounded),
            label: 'Photo Manager',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings_rounded),
            label: 'Configuration',
          ),
        ],
      ),
    );
  }
}
