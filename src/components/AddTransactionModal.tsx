import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import {
  Briefcase,
  Camera,
  Car,
  Check,
  Film,
  Gift,
  Heart,
  Image as ImageIcon,
  Laptop,
  Layers,
  ShoppingBag,
  TrendingUp,
  Utensils,
  X,
  Zap
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useToast } from "../context/ToastContext";
import { useTracker } from "../context/TrackerContext";
import { TransactionType } from "../database/db";
import { formatINR } from "../utils/currency";

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  editTransactionId?: number | null;
}

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Others",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investments",
  "Gifts",
  "Others",
];

const getCategoryDetails = (catName: string) => {
  switch (catName) {
    case "Food & Dining":
      return { icon: Utensils, color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)" };
    case "Shopping":
      return { icon: ShoppingBag, color: "#EC4899", bg: "rgba(236, 72, 153, 0.12)" };
    case "Transportation":
      return { icon: Car, color: "#3B82F6", bg: "rgba(59, 130, 246, 0.12)" };
    case "Entertainment":
      return { icon: Film, color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.12)" };
    case "Utilities":
      return { icon: Zap, color: "#EAB308", bg: "rgba(234, 179, 8, 0.12)" };
    case "Healthcare":
      return { icon: Heart, color: "#EF4444", bg: "rgba(239, 68, 68, 0.12)" };
    case "Salary":
      return { icon: Briefcase, color: "#10B981", bg: "rgba(16, 185, 129, 0.12)" };
    case "Freelance":
      return { icon: Laptop, color: "#06B6D4", bg: "rgba(6, 182, 212, 0.12)" };
    case "Investments":
      return { icon: TrendingUp, color: "#6366F1", bg: "rgba(99, 102, 241, 0.12)" };
    case "Gifts":
      return { icon: Gift, color: "#D946EF", bg: "rgba(217, 70, 239, 0.12)" };
    default:
      return { icon: Layers, color: "#8F9BB3", bg: "rgba(143, 155, 179, 0.12)" };
  }
};

export default function AddTransactionModal({
  visible,
  onClose,
  editTransactionId,
}: AddTransactionModalProps) {
  const { wallets, transactions, addTransaction, updateTransaction } = useTracker();
  const { toast } = useToast();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [walletId, setWalletId] = useState<number | null>(null);
  const [toWalletId, setToWalletId] = useState<number | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate state when editing a transaction
  useEffect(() => {
    if (editTransactionId && visible) {
      const tx = transactions.find((t) => t.id === editTransactionId);
      if (tx) {
        setType(tx.type);
        setAmount(String(tx.amount));
        setCategory(tx.category);
        setDescription(tx.description || "");
        setWalletId(tx.wallet_id);
        setToWalletId(tx.to_wallet_id || null);
        setReceiptUri(tx.receipt_image_path || null);
      }
    } else if (visible) {
      resetForm();
    }
  }, [editTransactionId, visible, transactions]);

  // Set default wallet selection when wallets load or visible shifts
  useEffect(() => {
    if (editTransactionId) return; // Don't overwrite when editing
    if (wallets.length > 0) {
      setWalletId(wallets[0].id);
      if (wallets.length > 1) {
        setToWalletId(wallets[1].id);
      }
    }
  }, [wallets, visible]);

  // Adjust categories automatically when transaction type toggles
  useEffect(() => {
    if (type === "expense") {
      setCategory(EXPENSE_CATEGORIES[0]);
    } else if (type === "income") {
      setCategory(INCOME_CATEGORIES[0]);
    } else {
      setCategory("Transfer");
    }
  }, [type]);

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Media library access is required to attach receipts.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await saveImageLocally(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Pick image error:", e);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera access is required to snap receipts.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await saveImageLocally(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Take photo error:", e);
      Alert.alert("Error", "Failed to capture photo.");
    }
  };

  const saveImageLocally = async (sourceUri: string) => {
    try {
      const fileName = `${Date.now()}_receipt.jpg`;
      const destUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destUri,
      });
      setReceiptUri(destUri);
    } catch (e) {
      console.error("Save image locally error:", e);
      Alert.alert("Error", "Failed to copy receipt to local storage.");
    }
  };

  const resetForm = () => {
    setType("expense");
    setAmount("");
    setDescription("");
    setReceiptUri(null);
    if (wallets.length > 0) {
      setWalletId(wallets[0].id);
      if (wallets.length > 1) {
        setToWalletId(wallets[1].id);
      }
    }
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Validation Error", "Please enter a valid positive amount.");
      return;
    }

    if (!walletId) {
      Alert.alert("Validation Error", "Please select a wallet.");
      return;
    }

    if (type === "transfer" && (!toWalletId || walletId === toWalletId)) {
      Alert.alert(
        "Validation Error",
        "Please select different source and destination wallets.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let result;
      if (editTransactionId) {
        const oldTx = transactions.find((t) => t.id === editTransactionId);
        const txDate = oldTx ? oldTx.date : new Date().toISOString();
        result = await updateTransaction(editTransactionId, {
          walletId,
          toWalletId: type === "transfer" ? toWalletId : null,
          type,
          amount: parsedAmount,
          category,
          description: description.trim(),
          date: txDate,
          receiptImagePath: receiptUri,
        });
      } else {
        result = await addTransaction({
          walletId,
          toWalletId: type === "transfer" ? toWalletId : null,
          type,
          amount: parsedAmount,
          category,
          description: description.trim(),
          date: new Date().toISOString(),
          receiptImagePath: receiptUri,
        });
      }

      if (result.success) {
        toast.success(editTransactionId ? "Transaction updated successfully" : "Transaction added successfully");
        resetForm();
        onClose();
      } else {
        Alert.alert(
          "Database Error",
          result.error || "Could not save transaction.",
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoriesToRender =
    type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalWrapper}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editTransactionId ? "Edit Transaction" : "Add Transaction"}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color="#8F9BB3" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={styles.scrollForm}
              keyboardShouldPersistTaps="handled"
            >
              {/* Type selector */}
              <View style={styles.typeSelectorRow}>
                {(["expense", "income", "transfer"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeBtn,
                      type === t && styles.typeBtnSelected,
                      type === t &&
                      t === "expense" &&
                      styles.typeExpenseSelected,
                      type === t && t === "income" && styles.typeIncomeSelected,
                      type === t &&
                      t === "transfer" &&
                      styles.typeTransferSelected,
                    ]}
                    onPress={() => setType(t)}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        type === t && styles.typeBtnTextSelected,
                      ]}
                    >
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount input */}
              <Text style={styles.sectionLabel}>Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#3D475C"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  maxLength={10}
                />
              </View>

              {/* Wallet Selectors */}
              <Text style={styles.sectionLabel}>
                {type === "transfer" ? "From Wallet" : "Wallet"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.walletScroll}
              >
                {wallets.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.walletItem,
                      walletId === w.id && styles.walletItemSelected,
                    ]}
                    onPress={() => setWalletId(w.id)}
                  >
                    <Text
                      style={[
                        styles.walletItemName,
                        walletId === w.id && styles.whiteText,
                      ]}
                    >
                      {w.name}
                    </Text>
                    <Text style={styles.walletItemBalance}>
                      {formatINR(w.balance)}
                    </Text>
                    {walletId === w.id && (
                      <View style={styles.checkIconBadge}>
                        <Check size={10} color="#FFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Destination Wallet for transfers */}
              {type === "transfer" && (
                <>
                  <Text style={styles.sectionLabel}>To Wallet</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.walletScroll}
                  >
                    {wallets.map((w) => (
                      <TouchableOpacity
                        key={w.id}
                        style={[
                          styles.walletItem,
                          toWalletId === w.id && styles.walletItemToSelected,
                        ]}
                        onPress={() => setToWalletId(w.id)}
                      >
                        <Text
                          style={[
                            styles.walletItemName,
                            toWalletId === w.id && styles.whiteText,
                          ]}
                        >
                          {w.name}
                        </Text>
                        <Text style={styles.walletItemBalance}>
                          {formatINR(w.balance)}
                        </Text>
                        {toWalletId === w.id && (
                          <View style={styles.checkIconToBadge}>
                            <Check size={10} color="#FFF" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Categories */}
              {type !== "transfer" && (
                <>
                  <Text style={styles.sectionLabel}>Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={styles.categoryScrollContent}
                  >
                    {categoriesToRender.map((cat) => {
                      const details = getCategoryDetails(cat);
                      const IconComponent = details.icon;
                      const isSelected = category === cat;

                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryBubble,
                            isSelected && {
                              borderColor: details.color,
                              backgroundColor: details.bg,
                            },
                          ]}
                          onPress={() => setCategory(cat)}
                        >
                          <View style={styles.categoryItemInner}>
                            <View style={[styles.categoryIconWrapper, { backgroundColor: isSelected ? details.color : "rgba(255, 255, 255, 0.05)" }]}>
                              <IconComponent size={13} color={isSelected ? "#101223" : details.color} />
                            </View>
                            <Text
                              style={[
                                styles.categoryBubbleText,
                                isSelected && { color: "#FFFFFF", fontWeight: "700" },
                              ]}
                            >
                              {cat}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Description */}
              <Text style={styles.sectionLabel}>Notes / Description</Text>
              <TextInput
                style={styles.descInput}
                placeholder="What was this for?"
                placeholderTextColor="#576275"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              {/* Attach receipt */}
              <Text style={styles.sectionLabel}>Receipt (Optional)</Text>
              {receiptUri ? (
                <View style={styles.receiptPreviewContainer}>
                  <Image
                    source={{ uri: receiptUri }}
                    style={styles.receiptPreviewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeReceiptBtn}
                    onPress={() => setReceiptUri(null)}
                  >
                    <X size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.receiptActionsRow}>
                  <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={handlePickImage}
                  >
                    <ImageIcon size={18} color="#6366F1" />
                    <Text style={styles.mediaButtonText}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={handleTakePhoto}
                  >
                    <Camera size={18} color="#10B981" />
                    <Text style={styles.mediaButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isSubmitting && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? "Saving..." : editTransactionId ? "Save Changes" : "Add Transaction"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 6, 12, 0.85)",
    justifyContent: "flex-end",
  },
  modalWrapper: {
    maxHeight: "90%",
  },
  modalContent: {
    backgroundColor: "#101223",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
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
    fontSize: 20,
    fontWeight: "700",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollForm: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 30,
  },
  typeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  typeBtnSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  typeExpenseSelected: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  typeIncomeSelected: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  typeTransferSelected: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  typeBtnText: {
    color: "#8F9BB3",
    fontSize: 12,
    fontWeight: "700",
  },
  typeBtnTextSelected: {
    color: "#FFFFFF",
  },
  sectionLabel: {
    color: "#B2C0D6",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 70,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 24,
  },
  currencySymbol: {
    color: "#6366F1",
    fontSize: 36,
    fontWeight: "700",
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  walletScroll: {
    marginBottom: 24,
  },
  walletItem: {
    backgroundColor: "#1E2240",
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    minWidth: 110,
    position: "relative",
  },
  walletItemSelected: {
    borderColor: "#6366F1",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  walletItemToSelected: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  walletItemName: {
    color: "#8F9BB3",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  whiteText: {
    color: "#FFF",
  },
  walletItemBalance: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  checkIconBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#6366F1",
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  checkIconToBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#F59E0B",
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryScroll: {
    marginBottom: 24,
  },
  categoryScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  categoryItemInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBubbleText: {
    color: "#B2C0D6",
    fontSize: 12,
    fontWeight: "600",
  },
  descInput: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    padding: 16,
    color: "#FFFFFF",
    fontSize: 15,
    textAlignVertical: "top",
    height: 80,
    marginBottom: 24,
  },
  receiptPreviewContainer: {
    position: "relative",
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 24,
  },
  receiptPreviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeReceiptBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  receiptActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  mediaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  mediaButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
