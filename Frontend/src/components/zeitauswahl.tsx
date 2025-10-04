import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, Animated } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type SubscriptionTime = {
  months: number;
  weeks: number;
  days: number;
};

type Props = {
  initialTime: SubscriptionTime;
  onSave: (newTime: SubscriptionTime) => void;
};

const BaseSubscriptionTimePicker: React.FC<
  Props & { withPulse?: boolean; showSmallLabel?: boolean }
> = ({ initialTime, onSave, withPulse = false, showSmallLabel = false }) => {
  const [time, setTime] = useState<SubscriptionTime>(initialTime);
  const [modalVisible, setModalVisible] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const totalDays = time.months * 30 + time.weeks * 7 + time.days;

  //  Pulsieren ab 3 Tage 
  useEffect(() => {
    if (withPulse && totalDays <= 3) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [time, withPulse]);

  const adjustTime = (field: keyof SubscriptionTime, delta: number) => {
    setTime((prev) => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta),
    }));
  };

  return (
    <View className="mb-4 rounded-lg ">
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Animated.View
          style={withPulse ? { opacity: pulseAnim } : {}}
          className={`p-1 rounded-lg items-center 
            ${ withPulse && totalDays <= 3 ? "bg-red-500" : ""}
            ${ withPulse  && totalDays > 3? "text-dark-b2" : ""}
            ${ !withPulse  ? "text-dark-b3" : ""  }
            ${ !withPulse  ? "bg-slate-600" : ""  }
             `}
        >

          {/* Text */}
          {withPulse && (
            <View className="flex-row items-center">
              <Ionicons
                name="time"
                size={16}
                color= "white"
              />
              <Text
                className="ml-1 text-sm font-semibold 
                   text-white "
              >
                {totalDays} Tage übrig
              </Text>
            </View>
          )}
          {!withPulse && (
            <View className="flex-row items-center mt-1 h-5">
              <Text
                className="ml-1 text-l font-bold text-dark-t1">
                  {time.months}M {time.weeks}W {time.days}T
              </Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal transparent={true} visible={modalVisible} animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center">
          <View className=" rounded-xl p-5 w-80 ">
            {(["months", "weeks", "days"] as (keyof SubscriptionTime)[]).map(
              (field) => (
                <View
                  key={field}
                  className="flex-row items-center justify-between my-2"
                >
                  <Text className="text-dark-t1 capitalize w-20 font-bold">{field}</Text>
                  <TouchableOpacity
                    onPress={() => adjustTime(field, -1)}
                    className=" rounded-md px-3 py-1"
                  >
                    <Text className="text-2xl font-bold text-dark-t1">-</Text>
                  </TouchableOpacity>
                    <Text className="mx-3 text-lg font-bold text-dark-t1">{time[field]}</Text>
                  <TouchableOpacity
                    onPress={() => adjustTime(field, 1)}
                    className="rounded-md px-3 py-1"
                  >
                    <Text className="text-lg font-bold text-dark-t1">+</Text>
                  </TouchableOpacity>
                </View>
              )
            )}

            <View className="flex-row justify-between mt-5">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="bg-red-500 px-4 py-2 rounded-md"
              >
                <Text className="font-bold">Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onSave(time);
                  setModalVisible(false);
                }}
                className="bg-green-500 px-4 py-2 rounded-md"
              >
                <Text className="text-light-t1 dark:text-dark-t1 font-bold">Bestätigen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const SubscriptionTimePicker = (props: Props) => (
  <BaseSubscriptionTimePicker {...props} withPulse={false} showSmallLabel={false} />
);

export const SubscriptionTimePickerWithPulse = (props: Props) => (
  <BaseSubscriptionTimePicker {...props} withPulse={true} showSmallLabel={true} />
);
