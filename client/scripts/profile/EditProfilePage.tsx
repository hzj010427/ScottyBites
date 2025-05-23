/**
 * Edit Profile Page.
 */

import { IProfile, IUpdateProfile } from '../../../common/profile.interface';

import React, {
  useState,
  useEffect,
  FormEvent,
  Dispatch,
  SetStateAction,
  ChangeEvent,
  KeyboardEvent,
} from 'react';

import ProfilePicture from './components/ProfilePicture';
import { showAlertToast } from '../utils/AlertToast';
import { showSuccessToast } from '../utils/SuccessToast';
import { getUsername } from './services/profileServices';
import { updateProfile } from './services/profileServices';

import {
  validRestrictions,
  foodCategories,
} from '../../../common/profileEntries';

export default function EditProfilePage({
  profile,
  setIsEditing,
  setProfile,
}: {
  profile: IProfile;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  setProfile: Dispatch<SetStateAction<IProfile | null>>;
}) {
  const [username, setUsername] = useState('');
  const [updatedProfile, setUpdatedProfile] = useState<IUpdateProfile>({
    favoriteFoods: profile.favoriteFoods,
    dietRestrictions: profile.dietRestrictions,
    visibility: profile.visibility,
  });
  const [filteredFoodCategories, setFilteredFoodCategories] =
    useState<string[]>(foodCategories);

  useEffect(() => {
    // Get the username
    getUsername(profile.userId).then((username) => {
      if (!username) {
        showAlertToast(
          'An unexpected error occurred while loading the username.'
        );
        return;
      }
      setUsername(username);
    });
  }, [profile.userId]);

  const handleFoodSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const newFood = e.target.value;
    if (newFood === '') {
      // Reset the filtered food categories
      setFilteredFoodCategories(foodCategories);
    } else {
      // Filter the food categories based on the search input
      setFilteredFoodCategories(() =>
        foodCategories.filter((category) =>
          category.toLowerCase().includes(newFood.toLowerCase())
        )
      );
    }
  };

  // Clear all selected items for diet restrictions or favorite foods
  const handleClearAll = (field: keyof IUpdateProfile) => () => {
    setUpdatedProfile((prevProfile: IUpdateProfile) => {
      return { ...prevProfile, [field]: [] };
    });
  };

  // Handle <enter> key down event for search input
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Do nothing if no input or no filtered food categories
      if (!e.currentTarget.value || filteredFoodCategories.length === 0) {
        return;
      }
      // Select the first item in the filtered food categories
      setUpdatedProfile((prevProfile: IUpdateProfile) => {
        const updatedField = [...(prevProfile.favoriteFoods as string[])];
        // No duplicates
        if (!updatedField.includes(filteredFoodCategories[0])) {
          // Max 3 favorite foods
          if (updatedField.length >= 3) {
            showAlertToast('You can only select up to 3 favorite foods.');
            return prevProfile;
          }
          updatedField.push(filteredFoodCategories[0]);
        }
        return { ...prevProfile, favoriteFoods: updatedField };
      });
      // Clear the search input
      const searchInput = document.querySelector('input[name="newFood"]');
      if (searchInput) {
        (searchInput as HTMLInputElement).value = '';
        // Reset the filtered food categories
        setFilteredFoodCategories(foodCategories);
      }
    }
  };

  //Dropdown Menu: Map the valid restrictions to checkboxes
  const dropdownCheckboxes = (field: keyof IUpdateProfile) => {
    let options: string[] = [];
    if (field === 'dietRestrictions') {
      options = validRestrictions;
    } else if (field === 'favoriteFoods') {
      options = filteredFoodCategories;
    } else {
      console.error(`[dropdownCheckboxes] Invalid field: ${field}`);
      return;
    }

    return (
      <div className="dropdown">
        {/*Default displayed title*/}
        <div
          className="form-select"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          data-bs-auto-close="outside"
        >
          {updatedProfile[field].length === 0 ? (
            <span>None Selected</span>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {updatedProfile[field].map((value) => (
                <span key={value} className="badge food-badge">
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>

        {/*Dropdown Menu*/}
        <div className="dropdown-menu dropdown-item-start w-100">
          <div className="mx-2 mt-0 d-flex flex-row justify-content-evenly gap-2">
            {/*Search input (only for food)*/}
            {field === 'favoriteFoods' && (
              <input
                type="text"
                name="newFood"
                className="form-control"
                placeholder="Type to search"
                onChange={handleFoodSearch}
                onKeyDown={(e) => handleKeyDown(e)}
              />
            )}
            {/*Clear all button*/}
            <button
              type="button"
              className="btn btn-primary text-nowrap"
              onClick={handleClearAll(field)}
            >
              Clear All
            </button>
          </div>
          {/*Map the valid restrictions to checkboxes*/}
          <ul className="edit-profile-dropdown p-0">
            {options.map((option) => (
              <li key={option} className="dropdown-item">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={option}
                    value={option}
                    checked={updatedProfile[field].includes(option)}
                    onChange={(e) => handleCheckboxChange(e, field)}
                  />
                  <label className="form-check-label w-100" htmlFor={option}>
                    {option}
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // Handle checkbox change for multiple selections (diet restrictions and favorite foods)
  const handleCheckboxChange = (
    event: ChangeEvent<HTMLInputElement>,
    field: keyof IUpdateProfile
  ) => {
    const { value, checked } = event.target;

    setUpdatedProfile((prevProfile: IUpdateProfile) => {
      let updatedField = [...(prevProfile[field] as string[])];

      // If checked, add to the array
      if (checked) {
        // No duplicates
        if (!updatedField.includes(value)) {
          // Max 3 favorite foods
          if (field === 'favoriteFoods' && updatedField.length >= 3) {
            showAlertToast('You can only select up to 3 favorite foods.');
            return prevProfile;
          }
          updatedField.push(value);
        }
      } else {
        // Uncheck, remove from the array
        updatedField = updatedField.filter(
          (restriction) => restriction !== value
        );
      }

      return { ...prevProfile, [field]: updatedField };
    });
  };

  // Toggle the profile visibility
  const handleVisibilityChange = () => {
    setUpdatedProfile((prevProfile: IUpdateProfile) => {
      prevProfile.visibility =
        prevProfile.visibility === 'public' ? 'private' : 'public';
      return prevProfile;
    });
  };

  // Handle the form submission
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Update the profile
    const updated = await updateProfile(profile.userId, updatedProfile);
    if (!updated) {
      showAlertToast(
        'An unexpected error occurred while updating the profile.'
      );
      return;
    }
    // Update the updated profile
    setUpdatedProfile({
      favoriteFoods: updated.favoriteFoods,
      dietRestrictions: updated.dietRestrictions,
      visibility: updated.visibility,
    });
    // Update the profile
    setProfile(updated);
    showSuccessToast('Profile updated successfully.');
  }

  return (
    <>
      {/*Avatar and Username*/}
      <div className="mb-3">
        <div className="d-flex justify-content-center mb-3">
          <ProfilePicture profile={profile} />
        </div>
        <h2 className="text-center">{username}</h2>
      </div>

      {/*Profile Form*/}
      <form
        className="d-flex flex-column justify-content-center mb-3 gap-3"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }} // Prevent form submission on <enter> key
      >
        {/*Diet Restrictions*/}
        <div className="d-flex flex-column">
          <label htmlFor="visibility" className="form-label">
            Diet Restrictions
          </label>
          {dropdownCheckboxes('dietRestrictions')}
        </div>

        {/*Favorite Foods*/}
        <div className="d-flex flex-column">
          <label htmlFor="visibility" className="form-label">
            Favorite Foods
          </label>
          {dropdownCheckboxes('favoriteFoods')}
        </div>

        {/*Profile Visibility*/}
        <div className="d-flex flex-column">
          <label htmlFor="visibility" className="form-label">
            Profile Visibility
          </label>
          <select
            name="visibility"
            className="form-select"
            defaultValue={profile.visibility}
            onChange={handleVisibilityChange}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {/*Buttons*/}
        <div className="d-flex justify-content-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsEditing(false)}
          >
            Back
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>

      {/*Alert Message*/}
    </>
  );
}
