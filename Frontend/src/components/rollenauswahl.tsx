import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList } from "react-native";

const roles = ["WhiteCard", "Admin", "User"];

const RoleDropdown: React.FC<{ value: string; onChange: (role: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <View className="mb-4 bg-slate-600 rounded-lg px-3 py-2">
      {/* Aktuelle Rolle */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="text-dark-b3 p-2 rounded-lg"
      >
        <Text className="text-lg text-dark-t1">{value}</Text>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal transparent={true} visible={open} animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center">
          <View className="text-dark-b3 rounded-xl p-5 w-72">
            <Text className="text-xl font-semibold mb-3 text-dark-t1">Rolle auswählen</Text>

            <FlatList
              data={roles}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="p-3 border-b border-gray-300"
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text className={`text-base ${item === value ? "font-bold text-xl text-sky-500" : "text-dark-t1 text-lg"} `}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Abbrechen */}
            <TouchableOpacity
              onPress={() => setOpen(false)}
              className="bg-red-500 mt-4 py-2 rounded-md"
            >
              <Text className="text-center text-dark-t1">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RoleDropdown;
