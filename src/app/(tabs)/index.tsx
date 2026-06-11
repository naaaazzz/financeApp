import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Trash2,
  Wallet as WalletIcon,
  X,
  LogOut,
  Edit2,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddTransactionModal from "../../components/AddTransactionModal";
import AnalyticsChart from "../../components/AnalyticsChart";
import { useAuth } from "../../context/AuthContext";
import { useTracker } from "../../context/TrackerContext";
import { Transaction, WalletType } from "../../database/db";
import { useToast } from "../../context/ToastContext";
import { formatINR } from "../../utils/currency";

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { transactions, wallets, addWallet, deleteTransaction } = useTracker();
  const { toast } = useToast();

  // Modal Visibility states
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editTxId, setEditTxId] = useState<number | null>(null);

  // New Wallet form states
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletBalance, setNewWalletBalance] = useState("");
  const [newWalletType, setNewWalletType] = useState<WalletType>("cash");
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  // 1. Calculate Balances & Summaries
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  // Current Month calculations
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentMonthTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= startOfMonth;
  });

  const monthIncome = currentMonthTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthExpense = currentMonthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const recentTransactions = transactions.slice(0, 5);

  const handleCreateWallet = async () => {
    const missing = [];
    if (!newWalletName.trim()) missing.push("Wallet Name");
    if (!newWalletBalance.trim()) missing.push("Starting Balance");

    if (missing.length > 0) {
      toast.error(`Missing fields: ${missing.join(", ")}`);
      return;
    }

    const initialBal = parseFloat(newWalletBalance);
    if (isNaN(initialBal)) {
      toast.error("Please enter a valid starting balance.");
      return;
    }

    setIsCreatingWallet(true);
    try {
      const res = await addWallet(
        newWalletName.trim(),
        initialBal,
        newWalletType,
      );
      if (res.success) {
        toast.success("Wallet created successfully.");
        setNewWalletName("");
        setNewWalletBalance("");
        setNewWalletType("cash");
        setWalletModalVisible(false);
      } else {
        toast.error(res.error || "Failed to create wallet.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleDeleteTx = async (txId: number) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? The wallet balance will be adjusted accordingly.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const res = await deleteTransaction(txId);
             if (res.success) {
               toast.success("Transaction deleted successfully");
               setSelectedTx(null);
             } else {
               Alert.alert(
                 "Error",
                 res.error || "Failed to delete transaction.",
               );
             }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out of your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await signOut();
            toast.success("Logged out successfully.");
          },
        },
      ],
    );
  };

  const getWalletIconDetails = (type: WalletType) => {
    switch (type) {
      case "bank":
        return {
          icon: <Landmark size={18} color="#FFFFFF" />,
          circleBg: "rgba(99, 102, 241, 0.3)",
          borderColor: "rgba(99, 102, 241, 0.25)",
          cardBg: "#13162C",
        };
      case "card":
        return {
          icon: <CreditCard size={18} color="#FFFFFF" />,
          circleBg: "rgba(236, 72, 153, 0.3)",
          borderColor: "rgba(236, 72, 153, 0.25)",
          cardBg: "#251322",
        };
      default:
        return {
          icon: <WalletIcon size={18} color="#FFFFFF" />,
          circleBg: "rgba(16, 185, 129, 0.3)",
          borderColor: "rgba(16, 185, 129, 0.25)",
          cardBg: "#0C1F16",
        };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>N</Text>
            </View>
            <View>
              <Text style={styles.greetingText}>Hello,</Text>
              <Text style={styles.usernameText}>
                {user
                  ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
                  : "User"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
            <LogOut size={22} color="#EF4444" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Combined Balance</Text>
          <Text style={styles.balanceAmount}>{formatINR(totalBalance)}</Text>
          <Text style={styles.balanceInfo}>All offline wallets summed</Text>
        </View>

        {/* Wallets Title & Row */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Wallets</Text>
          <TouchableOpacity
            onPress={() => setWalletModalVisible(true)}
            style={styles.addWalletBtn}
          >
            <Plus size={16} color="#6366F1" />
            <Text style={styles.addWalletText}>Add Wallet</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.walletsRow}
        >
          {wallets.map((w) => {
            const details = getWalletIconDetails(w.type);
            return (
              <View
                key={w.id}
                style={[
                  styles.walletCard,
                  { 
                    backgroundColor: details.cardBg,
                    borderColor: details.borderColor,
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={styles.walletCardHeader}>
                  <View style={[styles.walletIconCircle, { backgroundColor: details.circleBg }]}>
                    {details.icon}
                  </View>
                  <Text style={styles.walletTypeName}>
                    {w.type.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.walletName}>{w.name}</Text>
                <Text style={styles.walletBalance}>{formatINR(w.balance)}</Text>
              </View>
            );
          })}
          {wallets.length === 0 && (
            <Text style={styles.emptyText}>No wallets created yet.</Text>
          )}
        </ScrollView>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <View style={styles.summaryIconCircle}>
              <ArrowDownLeft size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel} numberOfLines={1}>Month Income</Text>
              <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>{formatINR(monthIncome)}</Text>
            </View>
          </View>

          <View style={[styles.summaryCard, styles.expenseCard]}>
            <View style={styles.summaryIconCircle}>
              <ArrowUpRight size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel} numberOfLines={1}>Month Expenses</Text>
              <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatINR(monthExpense)}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Chart */}
        <AnalyticsChart transactions={transactions} />

        {/* Recent Transactions List */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.txListContainer}>
          {recentTransactions.map((tx) => {
            const wallet = wallets.find((w) => w.id === tx.wallet_id);
            const toWallet = wallets.find((w) => w.id === tx.to_wallet_id);
            const isExpense = tx.type === "expense";
            const isIncome = tx.type === "income";

            return (
              <TouchableOpacity
                key={tx.id}
                style={styles.txItem}
                onPress={() => setSelectedTx(tx)}
              >
                <View style={styles.txItemLeft}>
                  <View
                    style={[
                      styles.txIconCircle,
                      isIncome && styles.incomeTxIcon,
                      isExpense && styles.expenseTxIcon,
                      tx.type === "transfer" && styles.transferTxIcon,
                    ]}
                  >
                    {isIncome ? (
                      <ArrowDownLeft size={16} color="#10B981" />
                    ) : isExpense ? (
                      <ArrowUpRight size={16} color="#EF4444" />
                    ) : (
                      <ArrowLeftRightIcon size={16} color="#F59E0B" />
                    )}
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txCategory}>
                      {tx.type === "transfer" ? "Transfer" : tx.category}
                    </Text>
                    <Text style={styles.txWalletName}>
                      {tx.type === "transfer"
                        ? `${wallet?.name || "Wallet"} → ${toWallet?.name || "Wallet"}`
                        : wallet?.name || "Wallet"}
                    </Text>
                  </View>
                </View>
                <View style={styles.txItemRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      isIncome && styles.incomeText,
                      isExpense && styles.expenseText,
                      tx.type === "transfer" && styles.transferText,
                    ]}
                  >
                    {isIncome ? "+" : isExpense ? "-" : ""}
                    {formatINR(tx.amount)}
                  </Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {transactions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions logged yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>


      {/* Add Transaction Dialog */}
      <AddTransactionModal
        visible={txModalVisible}
        onClose={() => {
          setTxModalVisible(false);
          setEditTxId(null);
        }}
        editTransactionId={editTxId}
      />

      {/* Wallet creation modal */}
      <Modal visible={walletModalVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={styles.walletModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Wallet</Text>
                <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                  <X size={20} color="#8F9BB3" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
                <View style={styles.walletForm}>
                  <Text style={styles.formLabel}>Wallet Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Salary Bank, Secret Cash"
                    placeholderTextColor="#576275"
                    value={newWalletName}
                    onChangeText={setNewWalletName}
                  />

                  <Text style={styles.formLabel}>Starting Balance</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    placeholderTextColor="#576275"
                    keyboardType="numeric"
                    value={newWalletBalance}
                    onChangeText={setNewWalletBalance}
                  />

                  <Text style={styles.formLabel}>Wallet Type</Text>
                  <View style={styles.walletTypeRow}>
                    {(["cash", "bank", "card"] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.walletTypeBtn,
                          newWalletType === t && styles.walletTypeBtnSelected,
                        ]}
                        onPress={() => setNewWalletType(t)}
                      >
                        <Text
                          style={[
                            styles.walletTypeBtnText,
                            newWalletType === t && styles.whiteText,
                          ]}
                        >
                          {t.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.createBtn,
                      isCreatingWallet && styles.disabledBtn,
                    ]}
                    onPress={handleCreateWallet}
                    disabled={isCreatingWallet}
                  >
                    <Text style={styles.createBtnText}>
                      {isCreatingWallet ? "Creating..." : "Create Wallet"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal visible={selectedTx !== null} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalContent}>
            {selectedTx && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Transaction Details</Text>
                  <TouchableOpacity onPress={() => setSelectedTx(null)}>
                    <X size={20} color="#8F9BB3" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.detailScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Big Amount Card */}
                  <View style={styles.detailAmountCard}>
                    <Text style={styles.detailCategoryLabel}>
                      {selectedTx.type === "transfer"
                        ? "Transfer"
                        : selectedTx.category}
                    </Text>
                    <Text
                      style={[
                        styles.detailAmount,
                        selectedTx.type === "income" && styles.incomeText,
                        selectedTx.type === "expense" && styles.expenseText,
                        selectedTx.type === "transfer" && styles.transferText,
                      ]}
                    >
                      {selectedTx.type === "income"
                        ? "+"
                        : selectedTx.type === "expense"
                          ? "-"
                          : ""}
                      {formatINR(selectedTx.amount)}
                    </Text>
                  </View>

                  {/* Info Row: Wallet, Date, Description */}
                  <View style={styles.detailInfoGroup}>
                    <View style={styles.infoRow}>
                      <WalletIcon
                        size={16}
                        color="#8F9BB3"
                        style={styles.infoIcon}
                      />
                      <View>
                        <Text style={styles.infoRowLabel}>Wallet Account</Text>
                        <Text style={styles.infoRowValue}>
                          {selectedTx.type === "transfer"
                            ? `${wallets.find((w) => w.id === selectedTx.wallet_id)?.name || "Wallet"} → ${wallets.find((w) => w.id === selectedTx.to_wallet_id)?.name || "Wallet"}`
                            : wallets.find((w) => w.id === selectedTx.wallet_id)
                                ?.name || "Wallet"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <Calendar
                        size={16}
                        color="#8F9BB3"
                        style={styles.infoIcon}
                      />
                      <View>
                        <Text style={styles.infoRowLabel}>Date & Time</Text>
                        <Text style={styles.infoRowValue}>
                          {new Date(selectedTx.date).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </Text>
                      </View>
                    </View>

                    {selectedTx.description && (
                      <View style={styles.infoRow}>
                        <FileText
                          size={16}
                          color="#8F9BB3"
                          style={styles.infoIcon}
                        />
                        <View>
                          <Text style={styles.infoRowLabel}>Notes</Text>
                          <Text style={styles.infoRowValue}>
                            {selectedTx.description}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Receipt Preview */}
                  {selectedTx.receipt_image_path && (
                    <View style={styles.detailReceiptGroup}>
                      <Text style={styles.detailReceiptLabel}>
                        Attached Receipt
                      </Text>
                      <View style={styles.detailReceiptFrame}>
                        <Image
                          source={{ uri: selectedTx.receipt_image_path }}
                          style={styles.detailReceiptImage}
                        />
                      </View>
                    </View>
                  )}

                  {/* Actions */}
                  <TouchableOpacity
                    style={styles.editTxBtn}
                    onPress={() => {
                      setEditTxId(selectedTx.id);
                      setSelectedTx(null);
                      setTxModalVisible(true);
                    }}
                  >
                    <Edit2 size={16} color="#FFFFFF" />
                    <Text style={styles.editTxBtnText}>
                      Edit Transaction
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteTxBtn}
                    onPress={() => handleDeleteTx(selectedTx.id)}
                  >
                    <Trash2 size={16} color="#FFFFFF" />
                    <Text style={styles.deleteTxBtnText}>
                      Delete Transaction
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Arrow left right helper fallback if needed
function ArrowLeftRightIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <ArrowUpRight size={size - 4} color={color} />
      <Text style={{ color, fontSize: 10, fontWeight: "bold", marginLeft: -4 }}>
        ⇄
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0C16",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greetingText: {
    color: "#8F9BB3",
    fontSize: 14,
  },
  usernameText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  balanceCard: {
    backgroundColor: "rgba(24, 27, 48, 0.7)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 24,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceLabel: {
    color: "#8F9BB3",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 6,
  },
  balanceInfo: {
    color: "#576275",
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  addWalletBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addWalletText: {
    color: "#6366F1",
    fontSize: 13,
    fontWeight: "700",
  },
  walletsRow: {
    marginBottom: 28,
  },
  walletCard: {
    width: 170,
    height: 135,
    borderRadius: 18,
    padding: 16,
    marginRight: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  walletCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  walletTypeName: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  walletName: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  walletBalance: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#181B30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  incomeCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  expenseCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: {
    color: "#8F9BB3",
    fontSize: 11,
    fontWeight: "600",
  },
  summaryAmount: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  txListContainer: {
    backgroundColor: "#101223",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 10,
    marginTop: 14,
  },
  txItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  txItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  txIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  incomeTxIcon: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  expenseTxIcon: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  transferTxIcon: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  txDetails: {
    gap: 4,
  },
  txCategory: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  txWalletName: {
    color: "#576275",
    fontSize: 12,
  },
  txItemRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  txDate: {
    color: "#576275",
    fontSize: 11,
  },
  incomeText: {
    color: "#10B981",
  },
  expenseText: {
    color: "#EF4444",
  },
  transferText: {
    color: "#F59E0B",
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 80 : 60,
    right: 24,
    backgroundColor: "#6366F1",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 6, 12, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  walletModalContent: {
    backgroundColor: "#101223",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
    maxWidth: 340,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  walletForm: {
    marginTop: 20,
  },
  formLabel: {
    color: "#B2C0D6",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 12,
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 16,
  },
  walletTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  walletTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
  },
  walletTypeBtnSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  walletTypeBtnText: {
    color: "#8F9BB3",
    fontSize: 10,
    fontWeight: "700",
  },
  createBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#576275",
    fontSize: 14,
    textAlign: "center",
  },
  whiteText: {
    color: "#FFFFFF",
  },
  detailModalContent: {
    backgroundColor: "#101223",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
    overflow: "hidden",
  },
  detailScroll: {
    padding: 24,
  },
  detailAmountCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    padding: 20,
    marginBottom: 20,
  },
  detailCategoryLabel: {
    color: "#8F9BB3",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailAmount: {
    fontSize: 28,
    fontWeight: "800",
  },
  detailInfoGroup: {
    gap: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    textAlignVertical: "center",
    padding: 7,
  },
  infoRowLabel: {
    color: "#576275",
    fontSize: 11,
    fontWeight: "600",
  },
  infoRowValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  detailReceiptGroup: {
    marginBottom: 24,
  },
  detailReceiptLabel: {
    color: "#8F9BB3",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailReceiptFrame: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  detailReceiptImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    backgroundColor: "#05060C",
  },
  editTxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    borderRadius: 14,
    height: 50,
    gap: 8,
    marginBottom: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  editTxBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  deleteTxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderRadius: 14,
    height: 50,
    gap: 8,
    marginBottom: 10,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  deleteTxBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
