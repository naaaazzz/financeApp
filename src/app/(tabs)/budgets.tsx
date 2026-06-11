import { AlertCircle, Edit2, Plus, Trash2, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTracker } from "../../context/TrackerContext";
import { Budget } from "../../database/db";
import { formatINR } from "../../utils/currency";
import { useToast } from "../../context/ToastContext";

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Others",
];

export default function BudgetsScreen() {
  const { transactions, budgets, addOrUpdateBudget, deleteBudget } =
    useTracker();
  const { toast } = useToast();

  // Dialog State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    EXPENSE_CATEGORIES[0],
  );
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Calculate Actual Spent per category for the current calendar month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentMonthExpenses = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return tx.type === "expense" && txDate >= startOfMonth;
  });

  const spentByCategory = currentMonthExpenses.reduce(
    (acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleSaveBudget = async () => {
    const missing = [];
    if (!selectedCategory) missing.push("Category");
    if (!budgetAmount.trim()) missing.push("Budget Limit");

    if (missing.length > 0) {
      toast.error(`Missing fields: ${missing.join(", ")}`);
      return;
    }

    const parsedAmount = parseFloat(budgetAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid budget limit.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addOrUpdateBudget(selectedCategory, parsedAmount);
      if (res.success) {
        toast.success("Budget limit saved successfully.");
        setBudgetAmount("");
        setModalVisible(false);
      } else {
        toast.error(res.error || "Failed to save budget.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budgetId: number) => {
    Alert.alert(
      "Remove Budget Limit",
      "Are you sure you want to remove this budget limit? Spent amounts will still be tracked, but no cap will be displayed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const res = await deleteBudget(budgetId);
            if (res.success) {
              toast.success("Budget limit removed successfully.");
            } else {
              toast.error(res.error || "Failed to delete budget.");
            }
          },
        },
      ],
    );
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedCategory(budget.category);
    setBudgetAmount(String(budget.amount));
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Budgets</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Helper Cards */}
        <View style={styles.tipCard}>
          <AlertCircle size={20} color="#6366F1" style={styles.tipIcon} />
          <Text style={styles.tipText}>
            Set caps for specific categories. Progress bars indicate current
            month expenditures and will highlight in orange or red when near or
            over limits.
          </Text>
        </View>

        {/* Budgets Progress List */}
        <View style={styles.budgetsList}>
          {budgets.map((b) => {
            const spent = spentByCategory[b.category] || 0;
            const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
            const remaining = Math.max(0, b.amount - spent);

            // Visual Colors
            let progressBarColor = "#10B981"; // Green
            let percentageTextColor = "#10B981";

            if (percentage >= 100) {
              progressBarColor = "#EF4444"; // Red
              percentageTextColor = "#EF4444";
            } else if (percentage >= 80) {
              progressBarColor = "#F59E0B"; // Orange
              percentageTextColor = "#F59E0B";
            }

            return (
              <View key={b.id} style={styles.budgetItem}>
                {/* Info row */}
                <View style={styles.budgetMeta}>
                  <View>
                    <Text style={styles.budgetCategory}>{b.category}</Text>
                    <Text style={styles.budgetSubText}>
                      {formatINR(spent)} of {formatINR(b.amount)} spent
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleEditBudget(b)}
                      style={styles.actionIconBtn}
                    >
                      <Edit2 size={15} color="#8F9BB3" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteBudget(b.id)}
                      style={styles.actionIconBtn}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress bar container */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, percentage)}%`,
                        backgroundColor: progressBarColor,
                      },
                    ]}
                  />
                </View>

                {/* Progress footer stats */}
                <View style={styles.budgetFooter}>
                  <Text style={styles.remainingText}>
                    {percentage >= 100
                      ? "Limit exceeded!"
                      : `${formatINR(remaining)} remaining`}
                  </Text>
                  <Text
                    style={[
                      styles.percentageText,
                      { color: percentageTextColor },
                    ]}
                  >
                    {percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
            );
          })}

          {budgets.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No budget caps configured yet.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyBtnText}>Configure First Cap</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add / Edit Budget Modal Dialog */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configure Budget</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={20} color="#8F9BB3" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
                <View style={styles.formContainer}>
                  {/* Category picker grid/bubbles */}
                  <Text style={styles.formLabel}>Select Category</Text>
                  <View style={styles.categoryGrid}>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryBubble,
                          selectedCategory === cat && styles.categoryBubbleSelected,
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.categoryBubbleText,
                            selectedCategory === cat && styles.whiteText,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Monthly budget amount limit */}
                  <Text style={styles.formLabel}>Monthly Spending Limit</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor="#3D475C"
                      keyboardType="numeric"
                      value={budgetAmount}
                      onChangeText={setBudgetAmount}
                      maxLength={10}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, isSubmitting && styles.disabledBtn]}
                    onPress={handleSaveBudget}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.saveBtnText}>
                      {isSubmitting ? "Saving..." : "Save Budget Cap"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0C16",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 110,
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
    padding: 16,
    gap: 12,
    marginBottom: 28,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    color: "#B2C0D6",
    fontSize: 13,
    lineHeight: 18,
  },
  budgetsList: {
    gap: 20,
  },
  budgetItem: {
    backgroundColor: "#181B30",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    padding: 18,
  },
  budgetMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  budgetCategory: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  budgetSubText: {
    color: "#8F9BB3",
    fontSize: 13,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remainingText: {
    color: "#576275",
    fontSize: 12,
    fontWeight: "600",
  },
  percentageText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#101223",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  emptyText: {
    color: "#576275",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 6, 12, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#101223",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
    maxWidth: 340,
    padding: 24,
    maxHeight: "90%",
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
  formContainer: {
    marginTop: 20,
  },
  formLabel: {
    color: "#B2C0D6",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  categoryBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  categoryBubbleSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  categoryBubbleText: {
    color: "#8F9BB3",
    fontSize: 12,
    fontWeight: "600",
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 24,
  },
  currencySymbol: {
    color: "#6366F1",
    fontSize: 22,
    fontWeight: "700",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  saveBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  whiteText: {
    color: "#FFFFFF",
  },
});
