import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import { colors } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import CustomInput from "../../components/CustomInput";
import ProgressDialog from "react-native-progress-dialog";
import CategoryList from "../../components/CategoryList";
import { supabase } from '../../supabase'; // Import Supabase client
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const ViewCategoryScreen = ({ navigation, route }) => {
  const { authUser } = route.params;
  const [user, setUser] = useState({});

  const getToken = (obj) => {
    try {
      setUser(JSON.parse(obj));
    } catch (e) {
      setUser(obj);
      return obj.token;
    }
    return JSON.parse(obj).token;
  };

  const [isloading, setIsloading] = useState(false);
  const [refeshing, setRefeshing] = useState(false);
  const [alertType, setAlertType] = useState("error");

  const [label, setLabel] = useState("Loading...");
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [filterItem, setFilterItem] = useState("");

  //method call on Pull refresh
  const handleOnRefresh = () => {
    setRefeshing(true);
    fetchCategories();
    setRefeshing(false);
  };

  //method to navigate to edit screen for specific catgeory
  const handleEdit = (item) => {
    navigation.navigate("editcategories", {
      category: item,
      authUser: authUser,
    });
  };

  //method to delete the specific catgeory
  const handleDelete = async (id) => {
    setIsloading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        setError(error.message);
        setAlertType('error');
      } else {
        fetchCategories();
        setError('تم حذف الفئة بنجاح');
        setAlertType('success');
      }
    } catch (error) {
      setError(error.message);
      setAlertType('error');
    } finally {
      setIsloading(false);
    }
  };

  // method for alert
  const showConfirmDialog = (id) => {
    return Alert.alert(
      "Are your sure?",
      "Are you sure you want to delete the category?",
      [
        {
          text: "Yes",
          onPress: () => {
            handleDelete(id);
          },
        },
        {
          text: "No",
        },
      ]
    );
  };

  //method the fetch the catgeories from server using API call
  const fetchCategories = async () => {
    setIsloading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');

      if (error) {
        setError(error.message);
        setAlertType('error');
      } else {
        // Transform data to include icon URLs
        const categoriesWithIcons = data.map(category => {
          const { data: { publicUrl } } = supabase.storage
            .from('category-icon')
            .getPublicUrl(category.icon);

          return {
            ...category,
            iconUrl: publicUrl // Add the public URL to the category object
          };
        });

        setCategories(categoriesWithIcons);
        setFoundItems(categoriesWithIcons);
        setError('');
      }
    } catch (error) {
      setError(error.message);
      setAlertType('error');
    } finally {
      setIsloading(false);
    }
  };

  //method to filer the product for by title [search bar]
  const filter = () => {
    const keyword = filterItem;
    if (keyword !== "") {
      const results = categories?.filter((item) => {
        return item?.title.toLowerCase().includes(keyword.toLowerCase());
      });
      setFoundItems(results);
    } else {
      setFoundItems(categories);
    }
  };

  //filter the data whenever filteritem value change
  useEffect(() => {
    filter();
  }, [filterItem]);

  //fetch the categories on initial render
  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <View style={styles.container}>
      <ProgressDialog visible={isloading} label={"جاري التحميل..."} />
      <StatusBar />
      <View style={styles.TopBarContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back-circle-outline"
            size={30}
            color={colors.muted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("addcategories", { authUser: authUser })}
        >
          <AntDesign name="plussquare" size={30} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.screenNameContainer}>
        <View>
          <Text style={styles.screenNameText}>عرض الفئات</Text>
        </View>
        <View>
          <Text style={styles.screenNameParagraph}>عرض جميع الفئات</Text>
        </View>
      </View>

      <CustomAlert message={error} type={alertType} />
      
      <View style={styles.bodyContainer}>
        <CustomInput
          radius={5}
          placeholder={"بحث..."}
          value={filterItem}
          setValue={setFilterItem}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refeshing} onRefresh={handleOnRefresh} />
          }
        >
          {foundItems && foundItems.length == 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{`لا توجد فئات تحتوي على "${filterItem}"!`}</Text>
            </View>
          ) : (
            foundItems.map((item, index) => (
              <CategoryList
                key={index}
                icon={item.iconUrl}
                title={item.title}
                description={item.description}
                onPressEdit={() => handleEdit(item)}
                onPressDelete={() => showConfirmDialog(item.id)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default ViewCategoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    padding: 20,
  },
  TopBarContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenNameContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  screenNameText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.muted,
  },
  screenNameParagraph: {
    marginTop: 5,
    fontSize: 15,
  },
  bodyContainer: {
    flex: 1,
    width: "100%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
});