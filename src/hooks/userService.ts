import users from "../../assets/users.json";



let userData = [...users]; // in-memory Kopie (später DB/API)

// Alle Nutzer 
export const getUsers = async () => {
  return [...userData];
};

// Nutzer hinzufügen
export const addUser = async (newUser: any) => {
  const newId = userData.length > 0 ? Math.max(...userData.map(u => u.id)) + 1 : 1;
  const user = { id: newId, ...newUser };
  userData.push(user);
  return user;
};

// Nutzer löschen
export const deleteUser = async (id: number) => {
  userData = userData.filter((u) => u.id !== id);
  return [...userData];
};
