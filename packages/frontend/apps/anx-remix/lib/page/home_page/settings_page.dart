import 'package:anx_reader/l10n/generated/L10n.dart';
import 'package:anx_reader/page/iap_page.dart';
import 'package:anx_reader/page/settings_page/more_settings_page.dart';
import 'package:anx_reader/providers/iap.dart';
import 'package:anx_reader/service/iap/iap_service.dart';
import 'package:anx_reader/utils/env_var.dart';
import 'package:anx_reader/widgets/settings/about.dart';
import 'package:anx_reader/widgets/settings/theme_mode.dart';
import 'package:anx_reader/widgets/settings/webdav_switch.dart';
import 'package:anx_reader/config/shared_preference_provider.dart';
import 'package:anx_reader/enums/sync_direction.dart';
import 'package:anx_reader/enums/sync_trigger.dart';
import 'package:anx_reader/providers/sync.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key, this.controller});

  final ScrollController? controller;

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  late final ScrollController _scrollController =
      widget.controller ?? ScrollController();

  Widget _buildWebdavQuickSyncRow(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _confirmSync(context, SyncDirection.upload),
              icon: const Icon(Icons.cloud_upload_outlined),
              label: Text(L10n.of(context).webdavUpload),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _confirmSync(context, SyncDirection.download),
              icon: const Icon(Icons.cloud_download_outlined),
              label: Text(L10n.of(context).webdavDownload),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _confirmSync(BuildContext context, SyncDirection direction) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(direction == SyncDirection.upload
              ? L10n.of(context).webdavUpload
              : L10n.of(context).webdavDownload),
          content: Text(direction == SyncDirection.upload
              ? L10n.of(context).settingsSyncUploadConfirm
              : L10n.of(context).settingsSyncDownloadConfirm),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(L10n.of(context).commonCancel),
            ),
            FilledButton(
              onPressed: () async {
                Navigator.pop(context);
                await Sync().syncData(direction, ref, trigger: SyncTrigger.manual);
              },
              child: Text(L10n.of(context).commonConfirm),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        controller: _scrollController,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 80),
          child: Column(
            children: [
              GestureDetector(
                onTap: () {},
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(0, 60, 0, 20),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 500),
                      child: Text(
                        'Anx',
                        style: TextStyle(
                          fontSize: 130,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const Divider(),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 8, 10, 8),
                child: ChangeThemeMode(),
              ),
              const Divider(),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: webdavSwitch(context, setState, ref),
              ),
              if (Prefs().webdavStatus) ...[
                _buildWebdavQuickSyncRow(context),
              ],
              const Divider(),
              const MoreSettings(),
              if (EnvVar.enableInAppPurchase)
                ListTile(
                  title: Text(L10n.of(context).iapPageTitle),
                  leading: const Icon(Icons.star_outline),
                  subtitle: Text(ref.watch(iapProvider).maybeWhen(
                        data: (state) => state.status.title(context),
                        orElse: () => L10n.of(context).iapStatusUnknown,
                      )),
                  onTap: () {
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (context) => const IAPPage()));
                  },
                ),
              const About(),
            ],
          ),
        ),
      ),
    );
  }
}
