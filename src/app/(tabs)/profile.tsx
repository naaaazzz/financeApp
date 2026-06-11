import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useState } from "react";
import {
    Alert,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Database, 
  Download, 
  Upload, 
  Wallet, 
  History, 
  PiggyBank, 
  FileSpreadsheet, 
  ChevronRight,
  User as UserIcon,
  ShieldCheck,
  Info
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useTracker } from "../../context/TrackerContext";
import { formatINR } from "../../utils/currency";

export default function ProfileScreen() {
  const { user } = useAuth();
  const { wallets, transactions, budgets } = useTracker();
  const [isWorking, setIsWorking] = useState(false);

  const exportTransactionsCSV = async () => {
    try {
      setIsWorking(true);
      const headers = [
        "id,user_id,wallet_id,to_wallet_id,type,amount,category,description,date,receipt_image_path,created_at",
      ];
      const rows = transactions.map((t) =>
        [
          t.id,
          t.user_id,
          t.wallet_id,
          t.to_wallet_id ?? "",
          t.type,
          t.amount,
          `"${(t.category || "").replace(/"/g, '""')}"`,
          `"${(t.description || "").replace(/"/g, '""')}"`,
          t.date,
          t.receipt_image_path ?? "",
          t.created_at,
        ].join(","),
      );

      const csv = headers.concat(rows).join("\n");
      const dir = `${FileSystem.documentDirectory}backups/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const path = `${dir}transactions-backup-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      await Share.share({ url: path, title: "Transactions CSV Backup" } as any);
    } catch (e: any) {
      console.error("Export CSV error", e);
      Alert.alert("Export Failed", e?.message || String(e));
    } finally {
      setIsWorking(false);
    }
  };

  const exportJSONBackup = async () => {
    try {
      setIsWorking(true);
      const data = {
        wallets,
        transactions,
        budgets,
        exported_at: new Date().toISOString(),
      };
      const dir = `${FileSystem.documentDirectory}backups/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const path = `${dir}backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Share.share({ url: path, title: "App JSON Backup" } as any);
    } catch (e: any) {
      console.error("Export JSON error", e);
      Alert.alert("Export Failed", e?.message || String(e));
    } finally {
      setIsWorking(false);
    }
  };

  const importJSONBackup = async () => {
    try {
      setIsWorking(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = JSON.parse(content);

      // Ask for confirmation
      Alert.alert(
        "Import Backup",
        "This will overwrite local wallets, transactions and budgets for your current account. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            style: "destructive",
            onPress: async () => await performImport(parsed),
          },
        ],
      );
    } catch (e: any) {
      console.error("Import error", e);
      Alert.alert("Import Failed", e?.message || String(e));
      setIsWorking(false);
    }
  };

  const performImport = async (parsed: any) => {
    try {
      setIsWorking(true);
      const dir = `${FileSystem.documentDirectory}backups/imported/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const path = `${dir}imported-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(
        path,
        JSON.stringify(parsed, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 },
      );
      Alert.alert(
        "Import saved",
        `Imported backup saved to ${path}. You may need to restart the app to apply changes.`,
      );
    } catch (e: any) {
      console.error("Perform import error", e);
      Alert.alert("Import Failed", e?.message || String(e));
    } finally {
      setIsWorking(false);
    }
  };

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile User Card */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarGlowCircle}>
            <View style={styles.avatarContainer}>
              <UserIcon size={36} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.usernameText}>
                {user ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : "User"}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>OFFLINE</Text>
              </View>
            </View>
            <Text style={styles.emailText}>{user?.email || "offline@tracker.local"}</Text>
          </View>
        </View>

        {/* Net Worth Summary Card */}
        <View style={styles.netWorthCard}>
          <View style={styles.netWorthHeader}>
            <Text style={styles.netWorthLabel}>Combined Balance</Text>
            <ShieldCheck size={16} color="#10B981" />
          </View>
          <Text style={styles.netWorthValue}>{formatINR(totalBalance)}</Text>
          <Text style={styles.netWorthSubtitle}>Secured offline on this device</Text>
        </View>

        {/* Account Summary Stats Grid */}
        <Text style={styles.sectionTitle}>Account Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.walletsCard]}>
            <View style={[styles.iconFrame, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
              <Wallet size={18} color="#6366F1" />
            </View>
            <Text style={styles.summaryValueLabel}>{wallets.length}</Text>
            <Text style={styles.summarySubLabel}>Wallets</Text>
          </View>

          <View style={[styles.summaryCard, styles.transactionsCard]}>
            <View style={[styles.iconFrame, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
              <History size={18} color="#10B981" />
            </View>
            <Text style={styles.summaryValueLabel}>{transactions.length}</Text>
            <Text style={styles.summarySubLabel}>Transactions</Text>
          </View>

          <View style={[styles.summaryCard, styles.budgetsCard]}>
            <View style={[styles.iconFrame, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
              <PiggyBank size={18} color="#F59E0B" />
            </View>
            <Text style={styles.summaryValueLabel}>{budgets.length}</Text>
            <Text style={styles.summarySubLabel}>Budgets</Text>
          </View>
        </View>

        {/* Backup & Restore Glass Box */}
        <Text style={styles.sectionTitle}>Backup & Data Actions</Text>
        <View style={styles.backupContainer}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={exportTransactionsCSV}
            disabled={isWorking}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconBg, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                <FileSpreadsheet size={20} color="#10B981" />
              </View>
              <View style={styles.actionTextGroup}>
                <Text style={styles.actionTitle}>Export CSV Sheet</Text>
                <Text style={styles.actionDesc}>Download transactions spreadsheet</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#4A5468" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={exportJSONBackup}
            disabled={isWorking}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconBg, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
                <Download size={20} color="#6366F1" />
              </View>
              <View style={styles.actionTextGroup}>
                <Text style={styles.actionTitle}>Export Database (JSON)</Text>
                <Text style={styles.actionDesc}>Full application database backup</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#4A5468" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={importJSONBackup}
            disabled={isWorking}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconBg, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
                <Upload size={20} color="#F59E0B" />
              </View>
              <View style={styles.actionTextGroup}>
                <Text style={styles.actionTitle}>Import Database (JSON)</Text>
                <Text style={styles.actionDesc}>Restore data from a backup file</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#4A5468" />
          </TouchableOpacity>
        </View>

        {/* Security & Info Card */}
        <View style={styles.infoBox}>
          <Info size={16} color="#6366F1" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Local Sandbox Storage</Text>
            <Text style={styles.infoText}>
              All transaction records are written securely to a SQLite file local to your mobile device. Backups are highly recommended before logging out or changing devices.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0C16",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 27, 48, 0.5)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  avatarGlowCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  usernameText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  statusBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  statusBadgeText: {
    color: "#10B981",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  emailText: {
    color: "#8F9BB3",
    fontSize: 13,
  },
  netWorthCard: {
    backgroundColor: "#13162C",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 24,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  netWorthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  netWorthLabel: {
    color: "#8F9BB3",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  netWorthValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },
  netWorthSubtitle: {
    color: "#576275",
    fontSize: 12,
    fontWeight: "500",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#101223",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
  },
  walletsCard: {
    borderTopWidth: 3,
    borderTopColor: "#6366F1",
  },
  transactionsCard: {
    borderTopWidth: 3,
    borderTopColor: "#10B981",
  },
  budgetsCard: {
    borderTopWidth: 3,
    borderTopColor: "#F59E0B",
  },
  iconFrame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryValueLabel: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  summarySubLabel: {
    color: "#576275",
    fontSize: 12,
    fontWeight: "600",
  },
  backupContainer: {
    backgroundColor: "rgba(24, 27, 48, 0.4)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  actionIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextGroup: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  actionDesc: {
    color: "#576275",
    fontSize: 12,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    borderColor: "rgba(99, 102, 241, 0.15)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  infoTitle: {
    color: "#B2C0D6",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoText: {
    color: "#576275",
    fontSize: 12,
    lineHeight: 18,
  },
});
