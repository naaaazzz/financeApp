import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  FileText,
  Search,
  Trash2,
  Wallet as WalletIcon,
  X,
  SlidersHorizontal,
  Edit2,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTracker } from "../../context/TrackerContext";
import { Transaction, TransactionType } from "../../database/db";
import { formatINR } from "../../utils/currency";
import AddTransactionModal from "../../components/AddTransactionModal";
import { useToast } from "../../context/ToastContext";

export default function TransactionsScreen() {
  const { transactions, wallets, deleteTransaction } = useTracker();
  const { toast } = useToast();

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>(
    "all",
  );
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Selected Transaction for details modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editTxId, setEditTxId] = useState<number | null>(null);

  // 1. Gather all categories present in transactions for the category filter bubble row
  const allCategories = Array.from(
    new Set(transactions.map((t) => t.category).filter(Boolean)),
  );

  // 2. Filter Transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Search query check
    const matchesSearch =
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description &&
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Type check
    const matchesType = selectedType === "all" || tx.type === selectedType;

    // Wallet check
    const matchesWallet =
      !selectedWalletId ||
      tx.wallet_id === selectedWalletId ||
      (tx.type === "transfer" && tx.to_wallet_id === selectedWalletId);

    // Category check
    const matchesCategory =
      !selectedCategory || tx.category === selectedCategory;

    return matchesSearch && matchesType && matchesWallet && matchesCategory;
  });

  const handleDeleteTx = async (txId: number) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      {/* Search Input & Filter Toggle */}
      <View style={styles.searchBoxContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color="#8F9BB3" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor="#576275"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={18} color="#8F9BB3" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={20} color={showFilters ? "#FFFFFF" : "#6366F1"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Filters Block */}
      {showFilters && (
        <View style={styles.filterSection}>
          {/* Type Selectors */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedType === "all" && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedType("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedType === "all" && styles.whiteText,
                ]}
              >
                ALL
              </Text>
            </TouchableOpacity>
            {(["expense", "income", "transfer"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  selectedType === type && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedType === type && styles.whiteText,
                  ]}
                >
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Wallet filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={styles.secondFilterRow}
          >
            <TouchableOpacity
              style={[
                styles.walletChip,
                selectedWalletId === null && styles.walletChipSelected,
              ]}
              onPress={() => setSelectedWalletId(null)}
            >
              <Text
                style={[
                  styles.walletChipText,
                  selectedWalletId === null && styles.whiteText,
                ]}
              >
                All Wallets
              </Text>
            </TouchableOpacity>
            {wallets.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[
                  styles.walletChip,
                  selectedWalletId === w.id && styles.walletChipSelected,
                ]}
                onPress={() => setSelectedWalletId(w.id)}
              >
                <Text
                  style={[
                    styles.walletChipText,
                    selectedWalletId === w.id && styles.whiteText,
                  ]}
                >
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category bubbles */}
          {allCategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={styles.secondFilterRow}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === null && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === null && styles.whiteText,
                  ]}
                >
                  All Categories
                </Text>
              </TouchableOpacity>
              {allCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.whiteText,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Main Transactions List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.txListContainer}>
          {filteredTransactions.map((tx) => {
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

          {filteredTransactions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No matching transactions found.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
                  {/* Amount Box */}
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

                  {/* Context Rows */}
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

                  {/* Image attachment */}
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

                  {/* Edit Button */}
                  <TouchableOpacity
                    style={styles.editTxBtn}
                    onPress={() => {
                      setEditTxId(selectedTx.id);
                      setSelectedTx(null);
                    }}
                  >
                    <Edit2 size={16} color="#FFFFFF" />
                    <Text style={styles.editTxBtnText}>
                      Edit Transaction
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Button */}
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

      {/* Edit Transaction Dialog */}
      <AddTransactionModal
        visible={editTxId !== null}
        onClose={() => {
          setEditTxId(null);
        }}
        editTransactionId={editTxId}
      />
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  searchBoxContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181B30",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 16,
    height: 48,
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#181B30",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterToggleBtnActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  filterSection: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  secondFilterRow: {
    marginTop: 8,
  },
  filterChip: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterChipSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  filterChipText: {
    color: "#8F9BB3",
    fontSize: 11,
    fontWeight: "700",
  },
  walletChip: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  walletChipSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  walletChipText: {
    color: "#8F9BB3",
    fontSize: 11,
    fontWeight: "600",
  },
  categoryChip: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  categoryChipSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  categoryChipText: {
    color: "#8F9BB3",
    fontSize: 11,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 110,
  },
  txListContainer: {
    backgroundColor: "#101223",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    marginTop: 10,
  },
  txItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
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
  whiteText: {
    color: "#FFFFFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 6, 12, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
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
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#576275",
    fontSize: 14,
    textAlign: "center",
  },
});
