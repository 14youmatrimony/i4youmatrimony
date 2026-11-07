import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/supabase_service.dart';

/// Configuration Screen Widget to input and persist Supabase Project URL and Anon Key
///
/// Features:
/// - Accepts both full dashboard URLs and standard API endpoints.
/// - Automatically normalizes project dashboard URLs to `https://<ref>.supabase.co`.
/// - Persists credentials to [SharedPreferences] under keys `supabase_url` and `supabase_anon_key`.
/// - Re-initializes [SupabaseService] dynamically with saved credentials.
/// - In-app live connection testing to verify endpoint connectivity.
/// - Quick Reset to default project credentials.
class SupabaseConfigScreen extends StatefulWidget {
  final VoidCallback? onConfigurationSaved;

  const SupabaseConfigScreen({
    super.key,
    this.onConfigurationSaved,
  });

  @override
  State<SupabaseConfigScreen> createState() => _SupabaseConfigScreenState();
}

class _SupabaseConfigScreenState extends State<SupabaseConfigScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _urlController = TextEditingController();
  final TextEditingController _anonKeyController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  bool _isTesting = false;
  bool _obscureKey = true;
  String? _testStatusMessage;
  bool? _testStatusSuccess;

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  @override
  void dispose() {
    _urlController.dispose();
    _anonKeyController.dispose();
    super.dispose();
  }

  /// Loads credentials from SharedPreferences or defaults
  Future<void> _loadSavedCredentials() async {
    setState(() => _isLoading = true);
    final credentials = await SupabaseService.loadSavedCredentials();
    setState(() {
      _urlController.text = credentials['url'] ?? SupabaseService.defaultUrl;
      _anonKeyController.text = credentials['anonKey'] ?? SupabaseService.defaultAnonKey;
      _isLoading = false;
    });
  }

  /// Test connection to Supabase endpoint
  Future<void> _testConnection() async {
    final rawUrl = _urlController.text.trim();
    final rawKey = _anonKeyController.text.trim();

    if (rawUrl.isEmpty) {
      _showSnackBar('Please enter a Supabase Project URL first', isError: true);
      return;
    }

    setState(() {
      _isTesting = true;
      _testStatusMessage = null;
      _testStatusSuccess = null;
    });

    final result = await SupabaseService.testConnection(
      url: rawUrl,
      anonKey: rawKey,
    );

    if (!mounted) return;

    setState(() {
      _isTesting = false;
      _testStatusSuccess = result['success'] as bool? ?? false;
      _testStatusMessage = result['message'] as String? ?? 'Unknown result';
    });

    _showSnackBar(
      _testStatusSuccess == true
          ? 'Connected successfully to Supabase!'
          : 'Connection test failed. Check URL and Anon Key.',
      isError: _testStatusSuccess != true,
    );
  }

  /// Saves credentials to SharedPreferences and re-initializes Supabase
  Future<void> _saveConfiguration() async {
    if (!_formKey.currentState!.validate()) return;

    final inputUrl = _urlController.text.trim();
    final inputKey = _anonKeyController.text.trim();
    final normalized = SupabaseService.normalizeUrl(inputUrl);

    setState(() => _isSaving = true);

    try {
      // 1. Save to SharedPreferences & Re-initialize Supabase client
      await SupabaseService.reinitialize(
        url: normalized,
        anonKey: inputKey,
      );

      if (!mounted) return;

      setState(() {
        _isSaving = false;
        _urlController.text = normalized; // update input with normalized format
      });

      _showSnackBar('Supabase configuration saved & initialized successfully!');

      if (widget.onConfigurationSaved != null) {
        widget.onConfigurationSaved!();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      _showSnackBar('Failed to save configuration: $e', isError: true);
    }
  }

  /// Reset fields to default credentials
  Future<void> _resetToDefaults() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset to Defaults?'),
        content: const Text(
          'This will restore the default project URL (kzvdzospvgzlfkkptadl) and default anon key in SharedPreferences.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE11D48),
              foregroundColor: Colors.white,
            ),
            child: const Text('Reset'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await SupabaseService.resetCredentialsToDefaults();
      setState(() {
        _urlController.text = SupabaseService.defaultUrl;
        _anonKeyController.text = SupabaseService.defaultAnonKey;
        _testStatusMessage = null;
        _testStatusSuccess = null;
      });
      await SupabaseService.initialize();
      if (!mounted) return;
      _showSnackBar('Reset to default Supabase project credentials');
    }
  }

  /// Convenience paste from clipboard
  Future<void> _pasteToController(TextEditingController controller) async {
    final data = await Clipboard.getData('text/plain');
    if (data?.text != null && data!.text!.trim().isNotEmpty) {
      setState(() {
        controller.text = data.text!.trim();
      });
      _showSnackBar('Pasted from clipboard');
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        backgroundColor: isError ? Colors.red.shade700 : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFFE11D48)),
        ),
      );
    }

    final normalizedEndpoint = SupabaseService.normalizeUrl(_urlController.text);
    final projectRef = SupabaseService.extractProjectRef(_urlController.text);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Supabase Settings',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload from SharedPreferences',
            onPressed: _loadSavedCredentials,
          ),
          IconButton(
            icon: const Icon(Icons.restore),
            tooltip: 'Reset to Defaults',
            onPressed: _resetToDefaults,
          ),
        ],
      ),
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header card
                    _buildHeaderCard(projectRef),
                    const SizedBox(height: 20),

                    // Test Status Banner
                    if (_testStatusMessage != null) ...[
                      _buildStatusBanner(),
                      const SizedBox(height: 16),
                    ],

                    // Project URL input section
                    _buildUrlInputCard(normalizedEndpoint),
                    const SizedBox(height: 20),

                    // Anon Key input section
                    _buildAnonKeyInputCard(),
                    const SizedBox(height: 24),

                    // Action buttons
                    _buildActionButtons(),
                    const SizedBox(height: 24),

                    // Quick fill helper
                    _buildPresetHelpersCard(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderCard(String projectRef) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE11D48), Color(0xFFBE123C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFE11D48).withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.cloud_sync_rounded, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Supabase Project Configuration',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Project Ref: $projectRef',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 13,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Keys are saved into local SharedPreferences and used dynamically whenever the app initializes Supabase.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.92),
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBanner() {
    final isSuccess = _testStatusSuccess == true;
    final color = isSuccess ? const Color(0xFF059669) : const Color(0xFFDC2626);
    final bg = isSuccess ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            isSuccess ? Icons.check_circle_rounded : Icons.error_rounded,
            color: color,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _testStatusMessage ?? '',
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUrlInputCard(String normalizedEndpoint) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Supabase Project URL',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Color(0xFF0F172A),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _pasteToController(_urlController),
                  icon: const Icon(Icons.paste_rounded, size: 16),
                  label: const Text('Paste', style: TextStyle(fontSize: 12)),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFFE11D48),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Enter your Supabase API URL or paste the dashboard URL. Dashboard links will be automatically normalized.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _urlController,
              decoration: InputDecoration(
                hintText: 'https://kzvdzospvgzlfkkptadl.supabase.co',
                prefixIcon: const Icon(Icons.link_rounded, color: Color(0xFF64748B)),
                suffixIcon: _urlController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () => setState(() => _urlController.clear()),
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE11D48), width: 1.5),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
              onChanged: (_) => setState(() {}),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Supabase URL cannot be empty';
                }
                if (!value.startsWith('http://') && !value.startsWith('https://')) {
                  return 'URL must start with https:// or http://';
                }
                return null;
              },
            ),
            if (_urlController.text.trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, size: 16, color: Color(0xFF10B981)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Normalized: $normalizedEndpoint',
                        style: const TextStyle(
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: Color(0xFF334155),
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAnonKeyInputCard() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Public Anon Key (Client API Key)',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Color(0xFF0F172A),
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: Icon(
                        _obscureKey ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                        size: 18,
                        color: const Color(0xFF64748B),
                      ),
                      tooltip: _obscureKey ? 'Show Key' : 'Hide Key',
                      onPressed: () => setState(() => _obscureKey = !_obscureKey),
                    ),
                    TextButton.icon(
                      onPressed: () => _pasteToController(_anonKeyController),
                      icon: const Icon(Icons.paste_rounded, size: 16),
                      label: const Text('Paste', style: TextStyle(fontSize: 12)),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFFE11D48),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Enter the anon public key provided by Supabase. This key is safe to be stored in client applications.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _anonKeyController,
              obscureText: _obscureKey,
              maxLines: _obscureKey ? 1 : 4,
              decoration: InputDecoration(
                hintText: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                prefixIcon: const Icon(Icons.key_rounded, color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE11D48), width: 1.5),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Anon Key cannot be empty';
                }
                if (value.trim().length < 20) {
                  return 'Anon key is too short. Verify your key.';
                }
                return null;
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              flex: 1,
              child: OutlinedButton.icon(
                onPressed: _isTesting ? null : _testConnection,
                icon: _isTesting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.network_check_rounded, size: 18),
                label: Text(_isTesting ? 'Testing...' : 'Test Connection'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF0F172A),
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: _isSaving ? null : _saveConfiguration,
                icon: _isSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.save_rounded, size: 18),
                label: Text(
                  _isSaving ? 'Saving & Applying...' : 'Save to SharedPreferences',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE11D48),
                  foregroundColor: Colors.white,
                  elevation: 1,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPresetHelpersCard() {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF64748B)),
                SizedBox(width: 8),
                Text(
                  'Quick Fill & Defaults',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: Color(0xFF334155),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Text(
              'Click below to quickly load the provided project credentials into the form:',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.dashboard_customize_rounded, size: 16),
                  label: const Text('Use Dashboard URL'),
                  onPressed: () {
                    setState(() {
                      _urlController.text = SupabaseService.defaultDashboardUrl;
                    });
                    _showSnackBar('Loaded Supabase Dashboard link into URL field');
                  },
                ),
                ActionChip(
                  avatar: const Icon(Icons.bolt_rounded, size: 16),
                  label: const Text('Use API Endpoint URL'),
                  onPressed: () {
                    setState(() {
                      _urlController.text = SupabaseService.defaultUrl;
                    });
                    _showSnackBar('Loaded normalized API endpoint into URL field');
                  },
                ),
                ActionChip(
                  avatar: const Icon(Icons.vpn_key_rounded, size: 16),
                  label: const Text('Use Provided Anon Key'),
                  onPressed: () {
                    setState(() {
                      _anonKeyController.text = SupabaseService.defaultAnonKey;
                    });
                    _showSnackBar('Loaded provided Anon Key');
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
